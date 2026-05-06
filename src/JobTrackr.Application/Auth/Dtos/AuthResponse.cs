namespace JobTrackr.Application.Auth.Dtos;

public record AuthResponse(
    string AccessToken,
    DateTime ExpiresAtUtc,
    Guid UserId,
    string Email,
    string DisplayName);
