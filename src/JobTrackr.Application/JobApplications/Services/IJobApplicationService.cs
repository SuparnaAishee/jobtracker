using JobTrackr.Application.Common.Models;
using JobTrackr.Application.JobApplications.Dtos;

namespace JobTrackr.Application.JobApplications.Services;

public interface IJobApplicationService
{
    Task<PagedResult<JobApplicationDto>> GetAsync(JobApplicationQuery query, CancellationToken ct = default);
    Task<JobApplicationDto> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<JobApplicationDto> CreateAsync(CreateJobApplicationRequest request, CancellationToken ct = default);
    Task<JobApplicationDto> UpdateAsync(Guid id, UpdateJobApplicationRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
    Task<StatsResponse> GetStatsAsync(CancellationToken ct = default);
    Task<StatsResponse> GetPublicStatsAsync(string slug, CancellationToken ct = default);
}
