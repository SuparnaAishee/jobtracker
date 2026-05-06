using JobTrackr.Domain.Enums;

namespace JobTrackr.Application.JobApplications.Dtos;

public record UpdateJobApplicationRequest(
    string CompanyName,
    string Position,
    string? Location,
    string? JobUrl,
    decimal? SalaryMin,
    decimal? SalaryMax,
    string? Notes,
    ApplicationStatus Status,
    DateTime AppliedOn);
