using JobTrackr.Domain.Common;
using JobTrackr.Domain.Enums;

namespace JobTrackr.Domain.Entities;

public class PrepQuestion : BaseEntity
{
    public Guid SessionId { get; set; }
    public PrepSession Session { get; set; } = null!;

    public int Order { get; set; }
    public string Question { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Difficulty { get; set; } = string.Empty;
    public string WhyAsked { get; set; } = string.Empty;

    public string? ModelAnswer { get; set; }

    public PrepMastery Mastery { get; set; } = PrepMastery.New;

    public ICollection<PrepAttempt> Attempts { get; set; } = new List<PrepAttempt>();
}
