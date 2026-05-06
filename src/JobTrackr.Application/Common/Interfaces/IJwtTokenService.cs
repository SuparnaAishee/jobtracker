using JobTrackr.Domain.Entities;

namespace JobTrackr.Application.Common.Interfaces;

public interface IJwtTokenService
{
    string CreateToken(User user);
    DateTime GetExpiryUtc();
}
