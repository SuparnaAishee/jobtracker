using JobTrackr.Api.Hubs;
using JobTrackr.Application.Common.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace JobTrackr.Api.Notifications;

public class SignalRNotificationService : INotificationService
{
    private readonly IHubContext<NotificationsHub> _hub;

    public SignalRNotificationService(IHubContext<NotificationsHub> hub)
    {
        _hub = hub;
    }

    public Task NotifyApplicationChangedAsync(Guid userId, Guid applicationId, ApplicationChangeKind kind, CancellationToken ct = default)
    {
        var payload = new
        {
            id = applicationId.ToString(),
            kind = kind.ToString().ToLowerInvariant()
        };
        return _hub.Clients.User(userId.ToString()).SendAsync("applicationChanged", payload, ct);
    }
}
