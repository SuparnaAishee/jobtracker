namespace JobTrackr.Application.Common.Interfaces;

public enum ApplicationChangeKind { Created, Updated, Deleted }

public interface INotificationService
{
    Task NotifyApplicationChangedAsync(Guid userId, Guid applicationId, ApplicationChangeKind kind, CancellationToken ct = default);
}
