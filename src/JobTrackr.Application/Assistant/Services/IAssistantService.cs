using JobTrackr.Application.Assistant.Dtos;

namespace JobTrackr.Application.Assistant.Services;

public interface IAssistantService
{
    bool IsConfigured { get; }
    Task<AnalyzeJdResponse> AnalyzeJobDescriptionAsync(AnalyzeJdRequest request, CancellationToken ct = default);
    Task<CoverLetterResponse> GenerateCoverLetterAsync(CoverLetterRequest request, CancellationToken ct = default);
    Task<InterviewQuestionsResponse> GenerateInterviewQuestionsAsync(InterviewQuestionsRequest request, CancellationToken ct = default);
    Task<GradeAnswerResponse> GradeAnswerAsync(GradeAnswerRequest request, CancellationToken ct = default);
}
