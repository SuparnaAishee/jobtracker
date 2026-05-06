using JobTrackr.Application.JobApplications.Dtos;
using JobTrackr.Application.JobApplications.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobTrackr.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/public")]
public class PublicController : ControllerBase
{
    private readonly IJobApplicationService _service;

    public PublicController(IJobApplicationService service)
    {
        _service = service;
    }

    /// <summary>Anonymized pipeline stats for a public profile.</summary>
    [HttpGet("{slug}/stats")]
    [ProducesResponseType(typeof(StatsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StatsResponse>> GetStats(string slug, CancellationToken ct) =>
        Ok(await _service.GetPublicStatsAsync(slug, ct));
}
