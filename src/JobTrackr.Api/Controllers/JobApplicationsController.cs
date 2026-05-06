using JobTrackr.Application.Common.Models;
using JobTrackr.Application.JobApplications.Dtos;
using JobTrackr.Application.JobApplications.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobTrackr.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/job-applications")]
public class JobApplicationsController : ControllerBase
{
    private readonly IJobApplicationService _service;

    public JobApplicationsController(IJobApplicationService service)
    {
        _service = service;
    }

    /// <summary>List the current user's job applications, with search/filter/sort/pagination.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<JobApplicationDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<JobApplicationDto>>> Get(
        [FromQuery] JobApplicationQuery query, CancellationToken ct) =>
        Ok(await _service.GetAsync(query, ct));

    /// <summary>Get a single job application by id.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(JobApplicationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<JobApplicationDto>> GetById(Guid id, CancellationToken ct) =>
        Ok(await _service.GetByIdAsync(id, ct));

    /// <summary>Create a new job application.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(JobApplicationDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<JobApplicationDto>> Create(
        [FromBody] CreateJobApplicationRequest request, CancellationToken ct)
    {
        var created = await _service.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    /// <summary>Update an existing job application.</summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(JobApplicationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<JobApplicationDto>> Update(
        Guid id, [FromBody] UpdateJobApplicationRequest request, CancellationToken ct) =>
        Ok(await _service.UpdateAsync(id, request, ct));

    /// <summary>Delete a job application.</summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _service.DeleteAsync(id, ct);
        return NoContent();
    }

    /// <summary>Get aggregated pipeline stats for the current user.</summary>
    [HttpGet("stats")]
    [ProducesResponseType(typeof(StatsResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<StatsResponse>> GetStats(CancellationToken ct) =>
        Ok(await _service.GetStatsAsync(ct));
}
