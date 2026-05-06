using FluentValidation;
using JobTrackr.Application.Auth.Services;
using JobTrackr.Application.JobApplications.Services;
using JobTrackr.Application.Resumes.Services;
using JobTrackr.Application.Users.Services;
using Microsoft.Extensions.DependencyInjection;
using System.Reflection;

namespace JobTrackr.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IJobApplicationService, JobApplicationService>();
        services.AddScoped<IUserProfileService, UserProfileService>();
        services.AddScoped<IResumeService, ResumeService>();

        return services;
    }
}
