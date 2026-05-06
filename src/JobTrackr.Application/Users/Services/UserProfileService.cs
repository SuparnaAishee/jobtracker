using JobTrackr.Application.Common.Interfaces;
using JobTrackr.Application.Users.Dtos;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;
using NotFoundException = JobTrackr.Application.Common.Exceptions.NotFoundException;
using UnauthorizedException = JobTrackr.Application.Common.Exceptions.UnauthorizedException;
using ValidationException = JobTrackr.Application.Common.Exceptions.ValidationException;

namespace JobTrackr.Application.Users.Services;

public class UserProfileService : IUserProfileService
{
    private static readonly Regex SlugRegex = new("^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$", RegexOptions.Compiled);

    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public UserProfileService(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<UserProfileDto> GetMeAsync(CancellationToken ct = default)
    {
        var userId = _currentUser.UserId ?? throw new UnauthorizedException("Not signed in.");
        var user = await _db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new NotFoundException("User", userId);
        return new UserProfileDto(user.Id, user.Email, user.DisplayName, user.PublicSlug, user.IsPublic);
    }

    public async Task<UserProfileDto> UpdatePublicProfileAsync(UpdatePublicProfileRequest request, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId ?? throw new UnauthorizedException("Not signed in.");
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new NotFoundException("User", userId);

        string? slug = request.PublicSlug?.Trim().ToLowerInvariant();

        if (request.IsPublic)
        {
            if (string.IsNullOrEmpty(slug))
                throw new ValidationException(new[]
                {
                    new FluentValidation.Results.ValidationFailure(nameof(request.PublicSlug),
                        "A slug is required when the profile is public.")
                });
            if (!SlugRegex.IsMatch(slug))
                throw new ValidationException(new[]
                {
                    new FluentValidation.Results.ValidationFailure(nameof(request.PublicSlug),
                        "Slug must be 3-64 chars, lowercase letters, digits, or hyphens, not starting/ending with a hyphen.")
                });

            var conflict = await _db.Users.AnyAsync(u => u.PublicSlug == slug && u.Id != userId, ct);
            if (conflict)
                throw new ValidationException(new[]
                {
                    new FluentValidation.Results.ValidationFailure(nameof(request.PublicSlug),
                        "That slug is already taken.")
                });
        }

        user.PublicSlug = slug;
        user.IsPublic = request.IsPublic;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return new UserProfileDto(user.Id, user.Email, user.DisplayName, user.PublicSlug, user.IsPublic);
    }
}
