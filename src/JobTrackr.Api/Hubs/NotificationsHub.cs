using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace JobTrackr.Api.Hubs;

[Authorize]
public class NotificationsHub : Hub
{
    // Server-to-client events:
    //   applicationChanged: { id: string, kind: "created" | "updated" | "deleted" }
    //
    // The client only needs to listen — there are no client-callable methods on this hub yet.
}
