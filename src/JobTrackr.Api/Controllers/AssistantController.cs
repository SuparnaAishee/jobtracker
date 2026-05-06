using JobTrackr.Application.Assistant.Dtos;
using JobTrackr.Application.Assistant.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobTrackr.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/assistant")]
public class AssistantController : ControllerBase
{
    private readonly IAssistantService _assistant;

    public AssistantController(IAssistantService assistant)
    {
        _assistant = assistant;
    }

    /// <summary>Whether the AI assistant is configured (i.e. API key is set on the server).</summary>
    [HttpGet("status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult Status() =>
        Ok(new { configured = _assistant.IsConfigured });

    /// <summary>Analyze a job description against an optional resume.</summary>
    [HttpPost("analyze-jd")]
    [ProducesResponseType(typeof(AnalyzeJdResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<AnalyzeJdResponse>> Analyze([FromBody] AnalyzeJdRequest request, CancellationToken ct)
    {
        if (!_assistant.IsConfigured)
            return ServiceUnavailable("AI assistant is not configured. Ask the operator to set GEMINI_API_KEY.");
        if (string.IsNullOrWhiteSpace(request.JobDescription))
            return BadRequest(new { detail = "Job description is required." });
        return Ok(await _assistant.AnalyzeJobDescriptionAsync(request, ct));
    }

    /// <summary>Generate a tailored cover letter draft.</summary>
    [HttpPost("cover-letter")]
    [ProducesResponseType(typeof(CoverLetterResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<CoverLetterResponse>> CoverLetter([FromBody] CoverLetterRequest request, CancellationToken ct)
    {
        if (!_assistant.IsConfigured)
            return ServiceUnavailable("AI assistant is not configured. Ask the operator to set GEMINI_API_KEY.");
        if (string.IsNullOrWhiteSpace(request.JobDescription) ||
            string.IsNullOrWhiteSpace(request.Resume) ||
            string.IsNullOrWhiteSpace(request.CompanyName) ||
            string.IsNullOrWhiteSpace(request.Position))
            return BadRequest(new { detail = "JobDescription, Resume, CompanyName and Position are required." });
        return Ok(await _assistant.GenerateCoverLetterAsync(request, ct));
    }

    /// <summary>Generate likely interview questions tailored to a job description.</summary>
    [HttpPost("interview-questions")]
    [ProducesResponseType(typeof(InterviewQuestionsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<InterviewQuestionsResponse>> InterviewQuestions(
        [FromBody] InterviewQuestionsRequest request, CancellationToken ct)
    {
        if (!_assistant.IsConfigured)
            return ServiceUnavailable("AI assistant is not configured. Ask the operator to set GEMINI_API_KEY.");
        if (string.IsNullOrWhiteSpace(request.JobDescription))
            return BadRequest(new { detail = "Job description is required." });
        return Ok(await _assistant.GenerateInterviewQuestionsAsync(request, ct));
    }

    /// <summary>Rewrite a resume to better target a specific job description.</summary>
    [HttpPost("tailor-resume")]
    [ProducesResponseType(typeof(TailorResumeResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<TailorResumeResponse>> TailorResume(
        [FromBody] TailorResumeRequest request, CancellationToken ct)
    {
        if (!_assistant.IsConfigured)
            return ServiceUnavailable("AI assistant is not configured. Ask the operator to set GEMINI_API_KEY.");
        if (string.IsNullOrWhiteSpace(request.Resume) || string.IsNullOrWhiteSpace(request.JobDescription))
            return BadRequest(new { detail = "Resume and JobDescription are required." });
        return Ok(await _assistant.TailorResumeAsync(request, ct));
    }

    /// <summary>Grade a candidate's answer to an interview question.</summary>
    [HttpPost("grade-answer")]
    [ProducesResponseType(typeof(GradeAnswerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<GradeAnswerResponse>> GradeAnswer(
        [FromBody] GradeAnswerRequest request, CancellationToken ct)
    {
        if (!_assistant.IsConfigured)
            return ServiceUnavailable("AI assistant is not configured. Ask the operator to set GEMINI_API_KEY.");
        if (string.IsNullOrWhiteSpace(request.Question) || string.IsNullOrWhiteSpace(request.UserAnswer))
            return BadRequest(new { detail = "Question and UserAnswer are required." });
        return Ok(await _assistant.GradeAnswerAsync(request, ct));
    }

    private ObjectResult ServiceUnavailable(string detail) =>
        StatusCode(StatusCodes.Status503ServiceUnavailable, new ProblemDetails
        {
            Title = "AI assistant unavailable",
            Detail = detail,
            Status = StatusCodes.Status503ServiceUnavailable
        });
}
