using JobTrackr.Application.Users.Dtos;

namespace JobTrackr.Application.Users.Services;

public interface IUserProfileService
{
    Task<UserProfileDto> GetMeAsync(CancellationToken ct = default);
    Task<UserProfileDto> UpdatePublicProfileAsync(UpdatePublicProfileRequest request, CancellationToken ct = default);
}
