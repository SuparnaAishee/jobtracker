using JobTrackr.Application.Assistant.Dtos;
using JobTrackr.Application.Assistant.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace JobTrackr.Infrastructure.Assistant;

public class GeminiAssistantService : IAssistantService
{
    private const string EndpointBase = "https://generativelanguage.googleapis.com/v1beta/models";
    private static readonly TimeSpan ExhaustionWindow = TimeSpan.FromHours(24);

    private readonly HttpClient _http;
    private readonly GeminiSettings _settings;
    private readonly ILogger<GeminiAssistantService> _logger;
    private readonly List<string> _apiKeys;

    // keyIndex -> moment after which the key is considered usable again
    private readonly ConcurrentDictionary<int, DateTimeOffset> _exhausted = new();

    public GeminiAssistantService(
        HttpClient http,
        IOptions<GeminiSettings> options,
        ILogger<GeminiAssistantService> logger)
    {
        _http = http;
        _settings = options.Value;
        _logger = logger;

        _apiKeys = _settings.ApiKeys
            .Concat(string.IsNullOrWhiteSpace(_settings.ApiKey) ? Array.Empty<string>() : new[] { _settings.ApiKey })
            .Where(k => !string.IsNullOrWhiteSpace(k))
            .Select(k => k.Trim())
            .Distinct()
            .ToList();
    }

    public bool IsConfigured => _apiKeys.Count > 0;

    public async Task<AnalyzeJdResponse> AnalyzeJobDescriptionAsync(AnalyzeJdRequest request, CancellationToken ct = default)
    {
        EnsureConfigured();

        var system = """
            You analyze job descriptions for fit against a candidate's resume.
            Return ONLY a JSON object matching this schema:
            { "fitScore": <int 0-100>, "strengths": [string], "gaps": [string], "suggestedKeywords": [string], "summary": "string" }
            Ground every claim in the resume text. If no resume is provided, output strengths=[] and base gaps/keywords on the JD alone.
            """;

        var user = $"Job description:\n{Truncate(request.JobDescription, 3000)}\n\nResume:\n{Truncate(request.Resume, 5000) ?? "(not provided)"}";

        var schema = new
        {
            type = "object",
            properties = new
            {
                fitScore = new { type = "integer" },
                strengths = new { type = "array", items = new { type = "string" } },
                gaps = new { type = "array", items = new { type = "string" } },
                suggestedKeywords = new { type = "array", items = new { type = "string" } },
                summary = new { type = "string" }
            },
            required = new[] { "fitScore", "strengths", "gaps", "suggestedKeywords", "summary" }
        };

        var json = await CallAsync(system, user, structuredSchema: schema, maxOutputTokens: null, temperature: null, ct: ct);
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            return new AnalyzeJdResponse(
                FitScore: root.GetProperty("fitScore").GetInt32(),
                Strengths: root.GetProperty("strengths").EnumerateArray().Select(e => e.GetString() ?? "").ToList(),
                Gaps: root.GetProperty("gaps").EnumerateArray().Select(e => e.GetString() ?? "").ToList(),
                SuggestedKeywords: root.GetProperty("suggestedKeywords").EnumerateArray().Select(e => e.GetString() ?? "").ToList(),
                Summary: root.GetProperty("summary").GetString() ?? "");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse Gemini analyze response. Body: {Body}", json);
            throw new InvalidOperationException("Assistant returned an unexpected response.");
        }
    }

    public async Task<CoverLetterResponse> GenerateCoverLetterAsync(CoverLetterRequest request, CancellationToken ct = default)
    {
        EnsureConfigured();

        var tone = string.IsNullOrWhiteSpace(request.Tone) ? "professional, warm, concise" : request.Tone;
        var system = "You write tailored cover letters. Respond with ONLY the cover letter body — no preamble, no explanation, no markdown headings. 250-350 words.";
        var user = $"""
            Write a {tone} cover letter for {request.Position} at {request.CompanyName}.

            Job description:
            {Truncate(request.JobDescription, 3000)}

            Resume:
            {Truncate(request.Resume, 5000)}
            """;

        var letter = await CallAsync(system, user, structuredSchema: null, maxOutputTokens: null, temperature: null, ct: ct);
        return new CoverLetterResponse(letter.Trim());
    }

    public async Task<InterviewQuestionsResponse> GenerateInterviewQuestionsAsync(InterviewQuestionsRequest request, CancellationToken ct = default)
    {
        EnsureConfigured();

        var count = Math.Clamp(request.Count ?? 8, 3, 15);
        var system = $$"""
            You are an experienced hiring manager. Given a job description (and optionally the candidate's resume),
            produce {{count}} interview questions the candidate is likely to face.

            Output ONLY a JSON object matching:
            {
              "questions": [
                {
                  "question": "string — the interview question, written as the interviewer would ask it",
                  "category": "Behavioral" | "Technical" | "System Design" | "Role-specific" | "Culture fit",
                  "difficulty": "Easy" | "Medium" | "Hard",
                  "whyAsked": "1 short sentence — what the interviewer is probing for"
                }
              ]
            }

            Mix categories. Tailor the questions to the JD's required skills. Skew toward questions where
            the candidate's resume reveals possible gaps. Avoid generic filler.
            """;

        var user = $"""
            Job description:
            {Truncate(request.JobDescription, 3000)}

            Role hint: {(string.IsNullOrWhiteSpace(request.Role) ? "(infer from JD)" : request.Role)}

            Resume:
            {(string.IsNullOrWhiteSpace(request.Resume) ? "(not provided)" : Truncate(request.Resume, 5000))}
            """;

        var schema = new
        {
            type = "object",
            properties = new
            {
                questions = new
                {
                    type = "array",
                    items = new
                    {
                        type = "object",
                        properties = new
                        {
                            question = new { type = "string" },
                            category = new { type = "string" },
                            difficulty = new { type = "string" },
                            whyAsked = new { type = "string" }
                        },
                        required = new[] { "question", "category", "difficulty", "whyAsked" }
                    }
                }
            },
            required = new[] { "questions" }
        };

        var json = await CallAsync(system, user, structuredSchema: schema, maxOutputTokens: null, temperature: null, ct: ct);
        try
        {
            using var doc = JsonDocument.Parse(json);
            var qs = doc.RootElement.GetProperty("questions").EnumerateArray()
                .Select(q => new InterviewQuestionItem(
                    Question: q.GetProperty("question").GetString() ?? "",
                    Category: q.GetProperty("category").GetString() ?? "General",
                    Difficulty: q.GetProperty("difficulty").GetString() ?? "Medium",
                    WhyAsked: q.GetProperty("whyAsked").GetString() ?? ""))
                .ToList();
            return new InterviewQuestionsResponse(qs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse interview-questions response. Body: {Body}", json);
            throw new InvalidOperationException("Assistant returned an unexpected response.");
        }
    }

    public async Task<GradeAnswerResponse> GradeAnswerAsync(GradeAnswerRequest request, CancellationToken ct = default)
    {
        EnsureConfigured();

        var system = """
            You are a senior interviewer giving constructive feedback on a candidate's interview answer.
            Score 0-100 based on: relevance, specificity, structure (e.g. STAR for behavioral), and depth.
            Be candid. Note real gaps, but anchor every critique to the answer text.

            Output ONLY a JSON object matching:
            {
              "score": <int 0-100>,
              "strengths": [<short bullet — what the candidate did well>],
              "improvements": [<short bullet — what to add or fix>],
              "modelAnswer": "<a strong 120-200 word reference answer to the same question, written in first person>"
            }
            """;

        var user = $"""
            Question:
            {request.Question}

            Candidate's answer:
            {request.UserAnswer}

            Job description (context, may be empty):
            {Truncate(request.JobDescription, 3000) ?? "(not provided)"}

            Resume (context, may be empty):
            {Truncate(request.Resume, 5000) ?? "(not provided)"}
            """;

        var schema = new
        {
            type = "object",
            properties = new
            {
                score = new { type = "integer" },
                strengths = new { type = "array", items = new { type = "string" } },
                improvements = new { type = "array", items = new { type = "string" } },
                modelAnswer = new { type = "string" }
            },
            required = new[] { "score", "strengths", "improvements", "modelAnswer" }
        };

        var json = await CallAsync(system, user, structuredSchema: schema, maxOutputTokens: null, temperature: null, ct: ct);
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            return new GradeAnswerResponse(
                Score: root.GetProperty("score").GetInt32(),
                Strengths: root.GetProperty("strengths").EnumerateArray().Select(e => e.GetString() ?? "").ToList(),
                Improvements: root.GetProperty("improvements").EnumerateArray().Select(e => e.GetString() ?? "").ToList(),
                ModelAnswer: root.GetProperty("modelAnswer").GetString() ?? "");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse grade-answer response. Body: {Body}", json);
            throw new InvalidOperationException("Assistant returned an unexpected response.");
        }
    }

    public async Task<TailorResumeResponse> TailorResumeAsync(TailorResumeRequest request, CancellationToken ct = default)
    {
        EnsureConfigured();

        var system = """
            You rewrite resumes to better match a target job description without inventing experience.
            Rules:
            1. Preserve every employer, role, date, and project from the original resume.
            2. Reword bullets to surface skills and accomplishments that align with the JD's keywords.
            3. Reorder bullets so the most JD-relevant ones come first.
            4. Add a short "Professional Summary" section at the top tailored to this role.
            5. Never fabricate technologies, certifications, metrics, or job titles.

            Output ONLY a JSON object matching:
            {
              "tailoredResume": "<the rewritten resume in clean Markdown, with ## section headings>",
              "changes": [<3-7 short bullets describing what you changed and why>]
            }
            """;

        var user = $"""
            Target job description:
            {Truncate(request.JobDescription, 3000)}

            Original resume:
            {Truncate(request.Resume, 5000)}
            """;

        var schema = new
        {
            type = "object",
            properties = new
            {
                tailoredResume = new { type = "string" },
                changes = new { type = "array", items = new { type = "string" } }
            },
            required = new[] { "tailoredResume", "changes" }
        };

        // Tailoring needs more output room than the default and benefits from lower temperature.
        var json = await CallAsync(system, user, structuredSchema: schema, maxOutputTokens: 2500, temperature: 0.5, ct: ct);
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            return new TailorResumeResponse(
                TailoredResume: root.GetProperty("tailoredResume").GetString() ?? "",
                Changes: root.GetProperty("changes").EnumerateArray().Select(e => e.GetString() ?? "").ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse tailor-resume response. Body: {Body}", json);
            throw new InvalidOperationException("Assistant returned an unexpected response.");
        }
    }

    private void EnsureConfigured()
    {
        if (!IsConfigured)
            throw new InvalidOperationException("GEMINI_API_KEY not set.");
    }

    private static string? Truncate(string? input, int max) =>
        string.IsNullOrEmpty(input) || input.Length <= max
            ? input
            : input.Substring(0, max);

    private async Task<string> CallAsync(
        string system,
        string user,
        object? structuredSchema,
        int? maxOutputTokens,
        double? temperature,
        CancellationToken ct)
    {
        var generationConfig = new Dictionary<string, object?>
        {
            ["maxOutputTokens"] = maxOutputTokens ?? _settings.MaxOutputTokens,
            ["temperature"] = temperature ?? _settings.Temperature
        };
        if (structuredSchema is not null)
        {
            generationConfig["responseMimeType"] = "application/json";
            generationConfig["responseSchema"] = structuredSchema;
        }

        var body = new
        {
            systemInstruction = new { parts = new[] { new { text = system } } },
            contents = new[]
            {
                new { role = "user", parts = new[] { new { text = user } } }
            },
            generationConfig
        };

        var url = $"{EndpointBase}/{Uri.EscapeDataString(_settings.Model)}:generateContent";

        var attemptOrder = Enumerable.Range(0, _apiKeys.Count)
            .Where(IsKeyUsable)
            .ToList();

        if (attemptOrder.Count == 0)
        {
            // Every key is exhausted. Fall through and try them all anyway — quotas may have reset.
            attemptOrder = Enumerable.Range(0, _apiKeys.Count).ToList();
            _exhausted.Clear();
        }

        Exception? lastException = null;
        foreach (var keyIndex in attemptOrder)
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = JsonContent.Create(body)
            };
            req.Headers.Add("x-goog-api-key", _apiKeys[keyIndex]);
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            using var resp = await _http.SendAsync(req, ct);
            var raw = await resp.Content.ReadAsStringAsync(ct);

            if (resp.IsSuccessStatusCode)
                return ExtractText(raw);

            if (IsQuotaError(resp.StatusCode, raw))
            {
                _exhausted[keyIndex] = DateTimeOffset.UtcNow.Add(ExhaustionWindow);
                _logger.LogWarning("Gemini key #{Index} exhausted (status {Status}). Rotating.", keyIndex + 1, (int)resp.StatusCode);
                lastException = new InvalidOperationException($"Quota error on key #{keyIndex + 1}.");
                continue;
            }

            _logger.LogError("Gemini API error {Status} (key #{Index}): {Body}", resp.StatusCode, keyIndex + 1, raw);
            throw new InvalidOperationException($"Assistant call failed ({(int)resp.StatusCode}). See server logs.");
        }

        throw lastException ?? new InvalidOperationException("All Gemini keys are exhausted.");
    }

    private bool IsKeyUsable(int index) =>
        !_exhausted.TryGetValue(index, out var until) || until <= DateTimeOffset.UtcNow;

    private static bool IsQuotaError(HttpStatusCode status, string body)
    {
        if (status == HttpStatusCode.TooManyRequests) return true;
        if (status == HttpStatusCode.Forbidden && body.Contains("RESOURCE_EXHAUSTED", StringComparison.OrdinalIgnoreCase))
            return true;
        return false;
    }

    private string ExtractText(string raw)
    {
        using var doc = JsonDocument.Parse(raw);
        if (!doc.RootElement.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
        {
            _logger.LogError("Gemini response had no candidates: {Body}", raw);
            throw new InvalidOperationException("Assistant returned no candidates.");
        }

        var first = candidates[0];
        if (first.TryGetProperty("finishReason", out var reason) &&
            reason.GetString() is { } r && r != "STOP" && r != "MAX_TOKENS")
        {
            _logger.LogWarning("Gemini finished with reason {Reason}: {Body}", r, raw);
        }

        if (!first.TryGetProperty("content", out var content) ||
            !content.TryGetProperty("parts", out var parts) ||
            parts.GetArrayLength() == 0)
        {
            throw new InvalidOperationException("Assistant returned no text content.");
        }

        foreach (var part in parts.EnumerateArray())
        {
            if (part.TryGetProperty("text", out var text))
                return text.GetString() ?? "";
        }
        throw new InvalidOperationException("Assistant returned no text part.");
    }
}
