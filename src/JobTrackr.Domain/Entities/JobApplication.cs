using JobTrackr.Domain.Common;
using JobTrackr.Domain.Enums;

namespace JobTrackr.Domain.Entities;

public class JobApplication : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string CompanyName { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public string? Location { get; set; }
    public string? JobUrl { get; set; }
    public decimal? SalaryMin { get; set; }
    public decimal? SalaryMax { get; set; }
    public string? Notes { get; set; }

    public ApplicationStatus Status { get; set; } = ApplicationStatus.Saved;
    public DateTime AppliedOn { get; set; } = DateTime.UtcNow;

    public ICollection<InterviewEvent> InterviewEvents { get; set; } = new List<InterviewEvent>();
}
