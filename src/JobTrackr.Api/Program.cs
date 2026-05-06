using Hangfire;
using Hangfire.PostgreSql;
using JobTrackr.Api.Hubs;
using JobTrackr.Api.Jobs;
using JobTrackr.Api.Middleware;
using JobTrackr.Api.Notifications;
using JobTrackr.Application;
using JobTrackr.Application.Common.Interfaces;
using JobTrackr.Infrastructure;
using JobTrackr.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Serilog;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

if (Environment.GetEnvironmentVariable("SUPABASE_DB_HOST") is { Length: > 0 } supabaseHost)
{
    var port = Environment.GetEnvironmentVariable("SUPABASE_DB_PORT") ?? "5432";
    var db = Environment.GetEnvironmentVariable("SUPABASE_DB_NAME") ?? "postgres";
    var user = Environment.GetEnvironmentVariable("SUPABASE_DB_USER")
        ?? throw new InvalidOperationException("SUPABASE_DB_USER is required when SUPABASE_DB_HOST is set.");
    var password = Environment.GetEnvironmentVariable("SUPABASE_DB_PASSWORD")
        ?? throw new InvalidOperationException("SUPABASE_DB_PASSWORD is required when SUPABASE_DB_HOST is set.");

    builder.Configuration["ConnectionStrings:Postgres"] =
        $"Host={supabaseHost};Port={port};Database={db};Username={user};Password={password};" +
        "SSL Mode=Require;Trust Server Certificate=true;Pooling=true;Maximum Pool Size=20";
}

// Map Docker-Compose-style env vars (JWT_KEY, GEMINI_API_KEY, ...) onto the
// nested config keys ASP.NET binds (Jwt:Key, Gemini:ApiKey, ...). This lets the
// same .env file work in Docker Compose and Render without a translation layer.
foreach (var (envName, configKey) in new[]
{
    ("JWT_ISSUER", "Jwt:Issuer"),
    ("JWT_AUDIENCE", "Jwt:Audience"),
    ("JWT_KEY", "Jwt:Key"),
    ("JWT_EXPIRES_IN_MINUTES", "Jwt:ExpiresInMinutes"),
    ("GEMINI_API_KEY", "Gemini:ApiKey"),
    ("GEMINI_MODEL", "Gemini:Model"),
    ("GEMINI_MAX_OUTPUT_TOKENS", "Gemini:MaxOutputTokens"),
    ("GEMINI_TEMPERATURE", "Gemini:Temperature"),
})
{
    var value = Environment.GetEnvironmentVariable(envName);
    if (!string.IsNullOrEmpty(value))
        builder.Configuration[configKey] = value;
}

// Comma-separated list of Gemini API keys. The service rotates through them on
// 429/RESOURCE_EXHAUSTED so a portfolio demo never hits a hard quota wall.
var geminiKeysEnv = Environment.GetEnvironmentVariable("GEMINI_API_KEYS");
if (!string.IsNullOrWhiteSpace(geminiKeysEnv))
{
    var keys = geminiKeysEnv
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .ToArray();
    for (var i = 0; i < keys.Length; i++)
        builder.Configuration[$"Gemini:ApiKeys:{i}"] = keys[i];
}

builder.Host.UseSerilog((ctx, lc) => lc
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console());

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// SignalR — real-time notifications. JWT bearer needs to read the token from a
// query string on WebSocket upgrades (the browser can't set Authorization headers there).
builder.Services.AddSignalR();
builder.Services.AddScoped<INotificationService, SignalRNotificationService>();

// Hangfire — background jobs (storage in Postgres). Skipped in the Test
// environment because integration tests use the EF InMemory provider.
if (!builder.Environment.IsEnvironment("Test"))
{
    var pgConn = builder.Configuration.GetConnectionString("Postgres")
        ?? throw new InvalidOperationException("Connection string 'Postgres' is missing.");
    builder.Services.AddHangfire(c => c
        .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
        .UseSimpleAssemblyNameTypeSerializer()
        .UseRecommendedSerializerSettings()
        .UsePostgreSqlStorage(o => o.UseNpgsqlConnection(pgConn)));
    builder.Services.AddHangfireServer();
}
builder.Services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
{
    options.Events ??= new JwtBearerEvents();
    var existing = options.Events.OnMessageReceived;
    options.Events.OnMessageReceived = async ctx =>
    {
        if (existing is not null) await existing(ctx);
        var accessToken = ctx.Request.Query["access_token"];
        var path = ctx.HttpContext.Request.Path;
        if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            ctx.Token = accessToken;
    };
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "JobTrackr API",
        Version = "v1",
        Description = "Track job applications, interviews, and outcomes."
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Paste the JWT issued by /api/auth/login or /api/auth/register."
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });

    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath)) options.IncludeXmlComments(xmlPath);
});

builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .SetIsOriginAllowed(_ => true) // dev-friendly; tighten for prod via Cors:AllowedOrigins
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

var app = builder.Build();

await ApplyMigrationsAsync(app);

app.UseSerilogRequestLogging();
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<NotificationsHub>("/hubs/notifications");
app.MapGet("/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();

if (!app.Environment.IsEnvironment("Test"))
{
    // Hangfire dashboard at /hangfire. Since this app uses JWT (not cookies),
    // the default cookie-auth dashboard filter wouldn't work; localhost-only
    // is the simplest portfolio-grade guard.
    app.UseHangfireDashboard("/hangfire", new DashboardOptions
    {
        Authorization = new[] { new AllowAllInDevDashboardFilter(app.Environment) },
        DashboardTitle = "JobTrackr background jobs"
    });

    RecurringJob.AddOrUpdate<FollowUpReminderJob>(
        "follow-up-reminders",
        job => job.RunAsync(CancellationToken.None),
        "0 9 * * *");
}

app.Run();

static async Task ApplyMigrationsAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    if (db.Database.IsRelational())
        await db.Database.MigrateAsync();
}

public partial class Program { }
