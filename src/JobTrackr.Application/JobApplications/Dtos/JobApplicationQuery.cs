using JobTrackr.Domain.Enums;

namespace JobTrackr.Application.JobApplications.Dtos;

public class JobApplicationQuery
{
    public string? Search { get; set; }
    public ApplicationStatus? Status { get; set; }
    public string? SortBy { get; set; } = "appliedOn";
    public bool SortDescending { get; set; } = true;
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
