namespace JobTrackr.Application.Users.Dtos;

public record UserProfileDto(
    Guid Id,
    string Email,
    string DisplayName,
    string? PublicSlug,
    bool IsPublic);

public record UpdatePublicProfileRequest(bool IsPublic, string? PublicSlug);
