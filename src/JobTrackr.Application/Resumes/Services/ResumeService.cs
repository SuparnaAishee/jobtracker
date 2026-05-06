using JobTrackr.Application.Common.Interfaces;
using JobTrackr.Application.Resumes.Dtos;
using JobTrackr.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using NotFoundException = JobTrackr.Application.Common.Exceptions.NotFoundException;
using UnauthorizedException = JobTrackr.Application.Common.Exceptions.UnauthorizedException;
using ValidationException = JobTrackr.Application.Common.Exceptions.ValidationException;

namespace JobTrackr.Application.Resumes.Services;

public class ResumeService : IResumeService
{
    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "text/markdown"
    };
    private const long MaxBytes = 5 * 1024 * 1024;

    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IFileStorage _storage;

    public ResumeService(IApplicationDbContext db, ICurrentUserService currentUser, IFileStorage storage)
    {
        _db = db;
        _currentUser = currentUser;
        _storage = storage;
    }

    public async Task<IReadOnlyList<ResumeDto>> ListAsync(CancellationToken ct = default)
    {
        var userId = RequireUserId();
        return await _db.Resumes.AsNoTracking()
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new ResumeDto(r.Id, r.Label, r.OriginalFileName, r.ContentType, r.SizeBytes, r.CreatedAt))
            .ToListAsync(ct);
    }

    public async Task<ResumeDto> UploadAsync(UploadResumeMetadata metadata, CancellationToken ct = default)
    {
        var userId = RequireUserId();

        if (metadata.SizeBytes <= 0 || metadata.SizeBytes > MaxBytes)
            throw new ValidationException(new[]
            {
                new FluentValidation.Results.ValidationFailure("File", $"File must be 1 byte to {MaxBytes / (1024 * 1024)} MB.")
            });

        if (!AllowedContentTypes.Contains(metadata.ContentType))
            throw new ValidationException(new[]
            {
                new FluentValidation.Results.ValidationFailure("File",
                    $"Content type '{metadata.ContentType}' not allowed. Use PDF, DOC, DOCX, TXT, or MD.")
            });

        var storageKey = await _storage.SaveAsync(metadata.Content, metadata.OriginalFileName, ct);

        var resume = new Resume
        {
            UserId = userId,
            Label = string.IsNullOrWhiteSpace(metadata.Label) ? metadata.OriginalFileName : metadata.Label.Trim(),
            OriginalFileName = metadata.OriginalFileName,
            ContentType = metadata.ContentType,
            SizeBytes = metadata.SizeBytes,
            StorageKey = storageKey
        };
        _db.Resumes.Add(resume);
        await _db.SaveChangesAsync(ct);

        return new ResumeDto(resume.Id, resume.Label, resume.OriginalFileName, resume.ContentType, resume.SizeBytes, resume.CreatedAt);
    }

    public async Task<(Stream Content, string ContentType, string FileName)> DownloadAsync(Guid id, CancellationToken ct = default)
    {
        var userId = RequireUserId();
        var resume = await _db.Resumes.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId, ct)
            ?? throw new NotFoundException(nameof(Resume), id);

        var stream = await _storage.OpenReadAsync(resume.StorageKey, ct);
        return (stream, resume.ContentType, resume.OriginalFileName);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var userId = RequireUserId();
        var resume = await _db.Resumes.FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId, ct)
            ?? throw new NotFoundException(nameof(Resume), id);

        await _storage.DeleteAsync(resume.StorageKey, ct);
        _db.Resumes.Remove(resume);
        await _db.SaveChangesAsync(ct);
    }

    private Guid RequireUserId() =>
        _currentUser.UserId ?? throw new UnauthorizedException("Not signed in.");
}
