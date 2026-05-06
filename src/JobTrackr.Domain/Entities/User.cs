using JobTrackr.Domain.Common;

namespace JobTrackr.Domain.Entities;

public class User : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;

    public string? PublicSlug { get; set; }
    public bool IsPublic { get; set; }

    public ICollection<JobApplication> JobApplications { get; set; } = new List<JobApplication>();
    public ICollection<Resume> Resumes { get; set; } = new List<Resume>();
}
