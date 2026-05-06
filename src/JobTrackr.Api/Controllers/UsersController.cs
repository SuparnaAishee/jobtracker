using JobTrackr.Application.Users.Dtos;
using JobTrackr.Application.Users.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobTrackr.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly IUserProfileService _service;

    public UsersController(IUserProfileService service)
    {
        _service = service;
    }

    /// <summary>Get the current user's profile.</summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<UserProfileDto>> GetMe(CancellationToken ct) =>
        Ok(await _service.GetMeAsync(ct));

    /// <summary>Update the user's public profile setting + slug.</summary>
    [HttpPut("me/public-profile")]
    [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<UserProfileDto>> UpdatePublicProfile(
        [FromBody] UpdatePublicProfileRequest request, CancellationToken ct) =>
        Ok(await _service.UpdatePublicProfileAsync(request, ct));
}
