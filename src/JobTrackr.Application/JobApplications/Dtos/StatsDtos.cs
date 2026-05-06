using JobTrackr.Domain.Enums;

namespace JobTrackr.Application.JobApplications.Dtos;

public record StatsResponse(
    int Total,
    IReadOnlyList<StatusBreakdownItem> ByStatus,
    FunnelDto Funnel,
    IReadOnlyList<TimePoint> ApplicationsPerWeek,
    decimal? OfferRate,
    decimal? InterviewRate);

public record StatusBreakdownItem(ApplicationStatus Status, int Count);

public record FunnelDto(int Saved, int Applied, int Screening, int Interviewing, int Offer, int Accepted);

public record TimePoint(string WeekStartIso, int Count);
