using JobTrackr.Application.Common.Interfaces;
using JobTrackr.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace JobTrackr.Api.Jobs;

public class FollowUpReminderJob
{
    private readonly IApplicationDbContext _db;
    private readonly ILogger<FollowUpReminderJob> _logger;

    public FollowUpReminderJob(IApplicationDbContext db, ILogger<FollowUpReminderJob> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Scans for applications stuck in Applied/Screening for &gt;7 days and logs them.
    /// In a real product this would queue emails / push notifications; for the
    /// portfolio demo it logs a structured count per user.
    /// </summary>
    public async Task RunAsync(CancellationToken ct = default)
    {
        var threshold = DateTime.UtcNow.AddDays(-7);

        var stale = await _db.JobApplications.AsNoTracking()
            .Where(j => (j.Status == ApplicationStatus.Applied || j.Status == ApplicationStatus.Screening)
                        && j.AppliedOn <= threshold)
            .GroupBy(j => j.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        _logger.LogInformation(
            "FollowUpReminderJob ran: {UserCount} users have stale applications (total {Total}).",
            stale.Count, stale.Sum(s => s.Count));

        foreach (var row in stale)
            _logger.LogInformation("User {UserId} has {Count} stale applications.", row.UserId, row.Count);
    }
}
