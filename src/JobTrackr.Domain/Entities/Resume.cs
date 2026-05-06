using JobTrackr.Domain.Common;

namespace JobTrackr.Domain.Entities;

public class Resume : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Label { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string StorageKey { get; set; } = string.Empty;
}
