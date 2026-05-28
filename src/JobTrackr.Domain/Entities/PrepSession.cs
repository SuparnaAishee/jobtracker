using JobTrackr.Domain.Common;
using JobTrackr.Domain.Enums;

namespace JobTrackr.Domain.Entities;

public class PrepSession : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid? JobApplicationId { get; set; }
    public JobApplication? JobApplication { get; set; }

    public PrepMode Mode { get; set; } = PrepMode.Study;
    public string Title { get; set; } = string.Empty;

    public string? CompanyName { get; set; }
    public string? Position { get; set; }
    public string? JobDescriptionSnapshot { get; set; }

    public DateTime? CompletedAt { get; set; }

    public ICollection<PrepQuestion> Questions { get; set; } = new List<PrepQuestion>();
}
