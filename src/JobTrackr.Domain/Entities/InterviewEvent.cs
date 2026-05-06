using JobTrackr.Domain.Common;

namespace JobTrackr.Domain.Entities;

public class InterviewEvent : BaseEntity
{
    public Guid JobApplicationId { get; set; }
    public JobApplication JobApplication { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public DateTime ScheduledAt { get; set; }
    public string? Interviewer { get; set; }
    public string? Notes { get; set; }
    public bool Completed { get; set; }
}
