using JobTrackr.Application.Resumes.Dtos;
using JobTrackr.Application.Resumes.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobTrackr.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/resumes")]
public class ResumesController : ControllerBase
{
    private readonly IResumeService _service;

    public ResumesController(IResumeService service)
    {
        _service = service;
    }

    /// <summary>List the user's uploaded resumes.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ResumeDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ResumeDto>>> List(CancellationToken ct) =>
        Ok(await _service.ListAsync(ct));

    /// <summary>Upload a new resume (PDF/DOC/DOCX/TXT/MD up to 5 MB).</summary>
    [HttpPost]
    [RequestSizeLimit(6 * 1024 * 1024)]
    [ProducesResponseType(typeof(ResumeDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ResumeDto>> Upload(
        [FromForm] IFormFile file,
        [FromForm] string? label,
        CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { detail = "A file is required." });

        await using var stream = file.OpenReadStream();
        var dto = await _service.UploadAsync(new UploadResumeMetadata(
            Label: label ?? string.Empty,
            OriginalFileName: file.FileName,
            ContentType: file.ContentType,
            SizeBytes: file.Length,
            Content: stream), ct);

        return CreatedAtAction(nameof(Download), new { id = dto.Id }, dto);
    }

    /// <summary>Download a resume by id.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Download(Guid id, CancellationToken ct)
    {
        var (content, contentType, fileName) = await _service.DownloadAsync(id, ct);
        return File(content, contentType, fileName);
    }

    /// <summary>Delete a resume.</summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _service.DeleteAsync(id, ct);
        return NoContent();
    }
}
