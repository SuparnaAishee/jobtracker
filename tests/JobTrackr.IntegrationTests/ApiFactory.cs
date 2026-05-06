using JobTrackr.Application.Assistant.Services;
using JobTrackr.Application.Common.Interfaces;
using JobTrackr.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace JobTrackr.IntegrationTests;

public class ApiFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = $"jobtrackr-tests-{Guid.NewGuid()}";

    public IAssistantService? AssistantOverride { get; set; }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Issuer"] = "JobTrackr.Tests",
                ["Jwt:Audience"] = "JobTrackr.Tests.Clients",
                ["Jwt:Key"] = "test-key-for-integration-tests-must-be-long-enough-for-hs256",
                ["Jwt:ExpiresInMinutes"] = "60",
                ["ConnectionStrings:Postgres"] = "Host=ignored"
            });
        });

        builder.ConfigureServices(services =>
        {
            var dbContextDescriptor = services.SingleOrDefault(d =>
                d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
            if (dbContextDescriptor is not null) services.Remove(dbContextDescriptor);

            var dbContextScope = services.SingleOrDefault(d => d.ServiceType == typeof(ApplicationDbContext));
            if (dbContextScope is not null) services.Remove(dbContextScope);

            var appContextDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IApplicationDbContext));
            if (appContextDescriptor is not null) services.Remove(appContextDescriptor);

            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseInMemoryDatabase(_dbName));

            services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());

            if (AssistantOverride is not null)
            {
                var existing = services.Where(d => d.ServiceType == typeof(IAssistantService)).ToList();
                foreach (var d in existing) services.Remove(d);
                services.AddSingleton(AssistantOverride);
            }
        });
    }
}
