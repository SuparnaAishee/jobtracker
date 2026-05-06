using FluentAssertions;
using JobTrackr.Application.Auth.Dtos;
using JobTrackr.Application.JobApplications.Dtos;
using JobTrackr.Domain.Enums;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace JobTrackr.IntegrationTests.Controllers;

public class JobApplicationsEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public JobApplicationsEndpointsTests(ApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task FullFlow_RegisterLoginCreateAndList_Works()
    {
        var client = _factory.CreateClient();

        // Register
        var registerResp = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(
            $"user-{Guid.NewGuid():N}@example.com", "Password123!", "Test User"));
        registerResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await registerResp.Content.ReadFromJsonAsync<AuthResponse>();
        auth.Should().NotBeNull();

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.AccessToken);

        // Create
        var createResp = await client.PostAsJsonAsync("/api/job-applications", new CreateJobApplicationRequest(
            "Acme", "Backend Engineer", "Remote", null, 100000m, 130000m, null, ApplicationStatus.Applied, null));
        createResp.StatusCode.Should().Be(HttpStatusCode.Created);

        // List
        var listResp = await client.GetAsync("/api/job-applications");
        listResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var list = await listResp.Content.ReadFromJsonAsync<PagedResponse>();
        list!.TotalItems.Should().Be(1);
        list.Items.First().CompanyName.Should().Be("Acme");
    }

    [Fact]
    public async Task GetWithoutAuth_Returns401()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/job-applications");
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private record PagedResponse(IReadOnlyList<JobApplicationDto> Items, int Page, int PageSize, int TotalItems);
}
