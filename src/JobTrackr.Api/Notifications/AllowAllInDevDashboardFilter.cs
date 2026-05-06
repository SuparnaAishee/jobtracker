using Hangfire.Dashboard;

namespace JobTrackr.Api.Notifications;

/// <summary>
/// In Development, allow anyone to view the Hangfire dashboard so the demo is clickable.
/// In Production, fall back to the built-in localhost-only filter.
/// </summary>
public class AllowAllInDevDashboardFilter : IDashboardAuthorizationFilter
{
    private readonly IWebHostEnvironment _env;
    private readonly LocalRequestsOnlyAuthorizationFilter _localOnly = new();

    public AllowAllInDevDashboardFilter(IWebHostEnvironment env) => _env = env;

    public bool Authorize(DashboardContext context)
    {
        if (_env.IsDevelopment()) return true;
        return _localOnly.Authorize(context);
    }
}
