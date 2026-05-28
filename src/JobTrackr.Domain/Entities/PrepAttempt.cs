using JobTrackr.Domain.Common;

namespace JobTrackr.Domain.Entities;

public class PrepAttempt : BaseEntity
{
    public Guid QuestionId { get; set; }
    public PrepQuestion Question { get; set; } = null!;

    public string AnswerText { get; set; } = string.Empty;

    public int? Score { get; set; }
    public string? StrengthsJson { get; set; }
    public string? ImprovementsJson { get; set; }
    public string? ModelAnswer { get; set; }
}
