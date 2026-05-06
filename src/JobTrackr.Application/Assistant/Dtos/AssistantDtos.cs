namespace JobTrackr.Application.Assistant.Dtos;

public record AnalyzeJdRequest(string JobDescription, string? Resume);

public record AnalyzeJdResponse(
    int FitScore,
    IReadOnlyList<string> Strengths,
    IReadOnlyList<string> Gaps,
    IReadOnlyList<string> SuggestedKeywords,
    string Summary);

public record CoverLetterRequest(string JobDescription, string Resume, string CompanyName, string Position, string? Tone);

public record CoverLetterResponse(string CoverLetter);

public record InterviewQuestionsRequest(
    string JobDescription,
    string? Resume,
    string? Role,
    int? Count);

public record InterviewQuestionItem(
    string Question,
    string Category,
    string Difficulty,
    string WhyAsked);

public record InterviewQuestionsResponse(IReadOnlyList<InterviewQuestionItem> Questions);

public record GradeAnswerRequest(
    string Question,
    string UserAnswer,
    string? JobDescription,
    string? Resume);

public record GradeAnswerResponse(
    int Score,
    IReadOnlyList<string> Strengths,
    IReadOnlyList<string> Improvements,
    string ModelAnswer);
