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
        builder.UseEnvironment("Test");

        builder.ConfigureServices(services =>
        {
            var efDescriptors = services
                .Where(d =>
                    d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>) ||
                    d.ServiceType == typeof(DbContextOptions) ||
                    d.ServiceType == typeof(ApplicationDbContext) ||
                    d.ServiceType == typeof(IApplicationDbContext) ||
                    (d.ServiceType.FullName != null &&
                     d.ServiceType.FullName.StartsWith("Microsoft.EntityFrameworkCore")) ||
                    (d.ServiceType.FullName != null &&
                     d.ServiceType.FullName.StartsWith("Npgsql.EntityFrameworkCore")))
                .ToList();
            foreach (var d in efDescriptors) services.Remove(d);

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
