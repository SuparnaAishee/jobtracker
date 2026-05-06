using FluentAssertions;
using JobTrackr.Application.Assistant.Dtos;
using JobTrackr.Application.Assistant.Services;
using JobTrackr.Application.Auth.Dtos;
using Moq;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace JobTrackr.IntegrationTests.Controllers;

public class AssistantEndpointsTests
{
    private static async Task<(HttpClient client, Mock<IAssistantService> mock)> AuthedClient(bool configured)
    {
        var mock = new Mock<IAssistantService>();
        mock.SetupGet(x => x.IsConfigured).Returns(configured);

        var factory = new ApiFactory { AssistantOverride = mock.Object };
        var client = factory.CreateClient();

        var resp = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(
            $"ai-{Guid.NewGuid():N}@example.com", "Password123!", "AI Tester"));
        resp.EnsureSuccessStatusCode();
        var auth = await resp.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.AccessToken);
        return (client, mock);
    }

    [Fact]
    public async Task Status_Returns_Configured_Flag()
    {
        var (client, _) = await AuthedClient(configured: true);
        var resp = await client.GetAsync("/api/assistant/status");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<Dictionary<string, bool>>();
        body!["configured"].Should().BeTrue();
    }

    [Fact]
    public async Task AnalyzeJd_Returns_503_When_Not_Configured()
    {
        var (client, _) = await AuthedClient(configured: false);
        var resp = await client.PostAsJsonAsync("/api/assistant/analyze-jd",
            new AnalyzeJdRequest("Some JD", null));
        resp.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
    }

    [Fact]
    public async Task AnalyzeJd_Returns_400_When_JobDescription_Empty()
    {
        var (client, _) = await AuthedClient(configured: true);
        var resp = await client.PostAsJsonAsync("/api/assistant/analyze-jd",
            new AnalyzeJdRequest("", null));
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task AnalyzeJd_Returns_200_With_Service_Result()
    {
        var (client, mock) = await AuthedClient(configured: true);
        mock.Setup(x => x.AnalyzeJobDescriptionAsync(It.IsAny<AnalyzeJdRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AnalyzeJdResponse(
                FitScore: 84,
                Strengths: new[] { "Strong Postgres background" },
                Gaps: new[] { "No Kubernetes experience" },
                SuggestedKeywords: new[] { "K8s", "Helm" },
                Summary: "Solid match overall."));

        var resp = await client.PostAsJsonAsync("/api/assistant/analyze-jd",
            new AnalyzeJdRequest("Senior backend role …", "C# / Postgres / 5y"));
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<AnalyzeJdResponse>();
        body!.FitScore.Should().Be(84);
        body.SuggestedKeywords.Should().Contain("K8s");
    }

    [Fact]
    public async Task CoverLetter_Requires_All_Fields()
    {
        var (client, _) = await AuthedClient(configured: true);
        var resp = await client.PostAsJsonAsync("/api/assistant/cover-letter",
            new CoverLetterRequest(JobDescription: "JD", Resume: "", CompanyName: "Acme", Position: "Eng", Tone: null));
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CoverLetter_Returns_200_With_Generated_Body()
    {
        var (client, mock) = await AuthedClient(configured: true);
        mock.Setup(x => x.GenerateCoverLetterAsync(It.IsAny<CoverLetterRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CoverLetterResponse("Dear Acme team, I would love to..."));

        var resp = await client.PostAsJsonAsync("/api/assistant/cover-letter",
            new CoverLetterRequest("JD", "Resume", "Acme", "Eng", null));
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<CoverLetterResponse>();
        body!.CoverLetter.Should().StartWith("Dear");
    }

    [Fact]
    public async Task InterviewQuestions_Returns_200_With_Questions()
    {
        var (client, mock) = await AuthedClient(configured: true);
        mock.Setup(x => x.GenerateInterviewQuestionsAsync(It.IsAny<InterviewQuestionsRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new InterviewQuestionsResponse(new[]
            {
                new InterviewQuestionItem("Q1?", "Behavioral", "Easy", "Why we ask"),
                new InterviewQuestionItem("Q2?", "Technical", "Hard", "Why we ask")
            }));

        var resp = await client.PostAsJsonAsync("/api/assistant/interview-questions",
            new InterviewQuestionsRequest("Senior backend …", null, null, 2));
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<InterviewQuestionsResponse>();
        body!.Questions.Should().HaveCount(2);
        body.Questions[0].Category.Should().Be("Behavioral");
    }

    [Fact]
    public async Task GradeAnswer_Requires_Question_And_Answer()
    {
        var (client, _) = await AuthedClient(configured: true);
        var resp = await client.PostAsJsonAsync("/api/assistant/grade-answer",
            new GradeAnswerRequest("", "", null, null));
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GradeAnswer_Returns_200_With_Feedback()
    {
        var (client, mock) = await AuthedClient(configured: true);
        mock.Setup(x => x.GradeAnswerAsync(It.IsAny<GradeAnswerRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new GradeAnswerResponse(
                Score: 72,
                Strengths: new[] { "Concrete numbers" },
                Improvements: new[] { "Use STAR" },
                ModelAnswer: "Sample model answer..."));

        var resp = await client.PostAsJsonAsync("/api/assistant/grade-answer",
            new GradeAnswerRequest("Question?", "My answer.", null, null));
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<GradeAnswerResponse>();
        body!.Score.Should().Be(72);
        body.Improvements.Should().Contain("Use STAR");
    }

    [Fact]
    public async Task Endpoints_Require_Authentication()
    {
        var factory = new ApiFactory();
        var client = factory.CreateClient();

        var statuses = await Task.WhenAll(
            client.PostAsJsonAsync("/api/assistant/analyze-jd", new AnalyzeJdRequest("x", null)),
            client.PostAsJsonAsync("/api/assistant/cover-letter", new CoverLetterRequest("x", "x", "x", "x", null)),
            client.PostAsJsonAsync("/api/assistant/interview-questions", new InterviewQuestionsRequest("x", null, null, null)),
            client.PostAsJsonAsync("/api/assistant/grade-answer", new GradeAnswerRequest("x", "x", null, null)),
            client.GetAsync("/api/assistant/status"));

        statuses.Should().AllSatisfy(r => r.StatusCode.Should().Be(HttpStatusCode.Unauthorized));
    }
}
