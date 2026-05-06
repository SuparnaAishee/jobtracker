using FluentValidation;
using JobTrackr.Application.Common.Interfaces;
using JobTrackr.Application.Common.Models;
using JobTrackr.Application.JobApplications.Dtos;
using JobTrackr.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using NotFoundException = JobTrackr.Application.Common.Exceptions.NotFoundException;
using UnauthorizedException = JobTrackr.Application.Common.Exceptions.UnauthorizedException;
using ValidationException = JobTrackr.Application.Common.Exceptions.ValidationException;

namespace JobTrackr.Application.JobApplications.Services;

public class JobApplicationService : IJobApplicationService
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<CreateJobApplicationRequest> _createValidator;
    private readonly IValidator<UpdateJobApplicationRequest> _updateValidator;
    private readonly INotificationService? _notifications;

    public JobApplicationService(
        IApplicationDbContext db,
        ICurrentUserService currentUser,
        IValidator<CreateJobApplicationRequest> createValidator,
        IValidator<UpdateJobApplicationRequest> updateValidator,
        INotificationService? notifications = null)
    {
        _db = db;
        _currentUser = currentUser;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _notifications = notifications;
    }

    public async Task<PagedResult<JobApplicationDto>> GetAsync(JobApplicationQuery query, CancellationToken ct = default)
    {
        var userId = RequireUserId();

        var q = _db.JobApplications.AsNoTracking().Where(j => j.UserId == userId);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim().ToLower();
            q = q.Where(j =>
                j.CompanyName.ToLower().Contains(s) ||
                j.Position.ToLower().Contains(s) ||
                (j.Location != null && j.Location.ToLower().Contains(s)));
        }

        if (query.Status.HasValue)
            q = q.Where(j => j.Status == query.Status.Value);

        q = (query.SortBy?.ToLower(), query.SortDescending) switch
        {
            ("company", true) => q.OrderByDescending(j => j.CompanyName),
            ("company", false) => q.OrderBy(j => j.CompanyName),
            ("status", true) => q.OrderByDescending(j => j.Status),
            ("status", false) => q.OrderBy(j => j.Status),
            ("appliedon", false) => q.OrderBy(j => j.AppliedOn),
            _ => q.OrderByDescending(j => j.AppliedOn)
        };

        var total = await q.CountAsync(ct);
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);

        var items = await q
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(j => new JobApplicationDto(
                j.Id, j.CompanyName, j.Position, j.Location, j.JobUrl,
                j.SalaryMin, j.SalaryMax, j.Notes, j.Status, j.AppliedOn,
                j.CreatedAt, j.UpdatedAt))
            .ToListAsync(ct);

        return new PagedResult<JobApplicationDto>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalItems = total
        };
    }

    public async Task<JobApplicationDto> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var userId = RequireUserId();
        var entity = await _db.JobApplications.AsNoTracking()
            .FirstOrDefaultAsync(j => j.Id == id && j.UserId == userId, ct);

        if (entity is null)
            throw new NotFoundException(nameof(JobApplication), id);

        return Map(entity);
    }

    public async Task<JobApplicationDto> CreateAsync(CreateJobApplicationRequest request, CancellationToken ct = default)
    {
        var validation = await _createValidator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            throw new ValidationException(validation.Errors);

        var userId = RequireUserId();

        var entity = new JobApplication
        {
            UserId = userId,
            CompanyName = request.CompanyName.Trim(),
            Position = request.Position.Trim(),
            Location = request.Location?.Trim(),
            JobUrl = request.JobUrl?.Trim(),
            SalaryMin = request.SalaryMin,
            SalaryMax = request.SalaryMax,
            Notes = request.Notes?.Trim(),
            Status = request.Status,
            AppliedOn = request.AppliedOn ?? DateTime.UtcNow
        };

        _db.JobApplications.Add(entity);
        await _db.SaveChangesAsync(ct);
        if (_notifications is not null)
            await _notifications.NotifyApplicationChangedAsync(userId, entity.Id, ApplicationChangeKind.Created, ct);
        return Map(entity);
    }

    public async Task<JobApplicationDto> UpdateAsync(Guid id, UpdateJobApplicationRequest request, CancellationToken ct = default)
    {
        var validation = await _updateValidator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            throw new ValidationException(validation.Errors);

        var userId = RequireUserId();

        var entity = await _db.JobApplications.FirstOrDefaultAsync(j => j.Id == id && j.UserId == userId, ct);
        if (entity is null)
            throw new NotFoundException(nameof(JobApplication), id);

        entity.CompanyName = request.CompanyName.Trim();
        entity.Position = request.Position.Trim();
        entity.Location = request.Location?.Trim();
        entity.JobUrl = request.JobUrl?.Trim();
        entity.SalaryMin = request.SalaryMin;
        entity.SalaryMax = request.SalaryMax;
        entity.Notes = request.Notes?.Trim();
        entity.Status = request.Status;
        entity.AppliedOn = request.AppliedOn;
        entity.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        if (_notifications is not null)
            await _notifications.NotifyApplicationChangedAsync(userId, entity.Id, ApplicationChangeKind.Updated, ct);
        return Map(entity);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var userId = RequireUserId();
        var entity = await _db.JobApplications.FirstOrDefaultAsync(j => j.Id == id && j.UserId == userId, ct);
        if (entity is null)
            throw new NotFoundException(nameof(JobApplication), id);

        _db.JobApplications.Remove(entity);
        await _db.SaveChangesAsync(ct);
        if (_notifications is not null)
            await _notifications.NotifyApplicationChangedAsync(userId, entity.Id, ApplicationChangeKind.Deleted, ct);
    }

    public async Task<StatsResponse> GetStatsAsync(CancellationToken ct = default)
    {
        var userId = RequireUserId();
        var apps = await _db.JobApplications.AsNoTracking()
            .Where(j => j.UserId == userId)
            .Select(j => new { j.Status, j.AppliedOn })
            .ToListAsync(ct);
        return BuildStats(apps.Select(a => (a.Status, a.AppliedOn)));
    }

    public async Task<StatsResponse> GetPublicStatsAsync(string slug, CancellationToken ct = default)
    {
        var user = await _db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.PublicSlug == slug && u.IsPublic, ct);
        if (user is null)
            throw new NotFoundException("PublicProfile", slug);

        var apps = await _db.JobApplications.AsNoTracking()
            .Where(j => j.UserId == user.Id)
            .Select(j => new { j.Status, j.AppliedOn })
            .ToListAsync(ct);
        return BuildStats(apps.Select(a => (a.Status, a.AppliedOn)));
    }

    private static StatsResponse BuildStats(IEnumerable<(Domain.Enums.ApplicationStatus Status, DateTime AppliedOn)> rows)
    {
        var list = rows.ToList();
        var total = list.Count;

        var byStatus = Enum.GetValues<Domain.Enums.ApplicationStatus>()
            .Select(s => new StatusBreakdownItem(s, list.Count(r => r.Status == s)))
            .ToList();

        int Count(Domain.Enums.ApplicationStatus s) => list.Count(r => r.Status == s);
        var funnel = new FunnelDto(
            Count(Domain.Enums.ApplicationStatus.Saved),
            Count(Domain.Enums.ApplicationStatus.Applied),
            Count(Domain.Enums.ApplicationStatus.Screening),
            Count(Domain.Enums.ApplicationStatus.Interviewing),
            Count(Domain.Enums.ApplicationStatus.Offer),
            Count(Domain.Enums.ApplicationStatus.Accepted));

        var nowUtc = DateTime.UtcNow.Date;
        var thisWeekStart = nowUtc.AddDays(-(int)nowUtc.DayOfWeek);
        var weeks = Enumerable.Range(0, 12)
            .Select(i => thisWeekStart.AddDays(-7 * (11 - i)))
            .Select(start => new TimePoint(
                start.ToString("yyyy-MM-dd"),
                list.Count(r => r.AppliedOn >= start && r.AppliedOn < start.AddDays(7))))
            .ToList();

        var applied = byStatus.First(b => b.Status == Domain.Enums.ApplicationStatus.Applied).Count;
        var interviewing = byStatus.First(b => b.Status == Domain.Enums.ApplicationStatus.Interviewing).Count;
        var offer = byStatus.First(b => b.Status == Domain.Enums.ApplicationStatus.Offer).Count
                    + byStatus.First(b => b.Status == Domain.Enums.ApplicationStatus.Accepted).Count;

        decimal? interviewRate = total == 0 ? null : Math.Round((decimal)interviewing / total, 4);
        decimal? offerRate = total == 0 ? null : Math.Round((decimal)offer / total, 4);

        return new StatsResponse(total, byStatus, funnel, weeks, offerRate, interviewRate);
    }

    private Guid RequireUserId() =>
        _currentUser.UserId ?? throw new UnauthorizedException("User is not authenticated.");

    private static JobApplicationDto Map(JobApplication j) =>
        new(j.Id, j.CompanyName, j.Position, j.Location, j.JobUrl, j.SalaryMin, j.SalaryMax,
            j.Notes, j.Status, j.AppliedOn, j.CreatedAt, j.UpdatedAt);
}
