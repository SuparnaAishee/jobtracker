using FluentAssertions;
using JobTrackr.Application.Common.Exceptions;
using JobTrackr.Application.Common.Interfaces;
using JobTrackr.Application.JobApplications.Dtos;
using JobTrackr.Application.JobApplications.Services;
using JobTrackr.Application.JobApplications.Validators;
using JobTrackr.Domain.Entities;
using JobTrackr.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace JobTrackr.UnitTests.Services;

public class JobApplicationServiceTests
{
    private static (TestDbContext db, Mock<ICurrentUserService> currentUser, JobApplicationService service, Guid userId) Build()
    {
        var options = new DbContextOptionsBuilder<TestDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new TestDbContext(options);

        var userId = Guid.NewGuid();
        var currentUser = new Mock<ICurrentUserService>();
        currentUser.SetupGet(x => x.UserId).Returns(userId);
        currentUser.SetupGet(x => x.IsAuthenticated).Returns(true);

        var service = new JobApplicationService(
            db,
            currentUser.Object,
            new CreateJobApplicationValidator(),
            new UpdateJobApplicationValidator());

        return (db, currentUser, service, userId);
    }

    [Fact]
    public async Task CreateAsync_ValidRequest_PersistsAndReturnsDto()
    {
        var (db, _, service, userId) = Build();
        var request = new CreateJobApplicationRequest(
            "Acme Corp", "Software Engineer", "Remote", "https://example.com",
            100000m, 130000m, "Found via referral.", ApplicationStatus.Applied, null);

        var result = await service.CreateAsync(request);

        result.CompanyName.Should().Be("Acme Corp");
        result.Status.Should().Be(ApplicationStatus.Applied);
        var stored = await db.JobApplications.SingleAsync();
        stored.UserId.Should().Be(userId);
    }

    [Fact]
    public async Task CreateAsync_BlankCompany_ThrowsValidationException()
    {
        var (_, _, service, _) = Build();
        var request = new CreateJobApplicationRequest(
            "", "Software Engineer", null, null, null, null, null, ApplicationStatus.Applied, null);

        var act = () => service.CreateAsync(request);

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task GetByIdAsync_OtherUsersRecord_ThrowsNotFoundException()
    {
        var (db, _, service, _) = Build();
        var otherUsersApp = new JobApplication
        {
            UserId = Guid.NewGuid(),
            CompanyName = "Other",
            Position = "Other"
        };
        db.JobApplications.Add(otherUsersApp);
        await db.SaveChangesAsync();

        var act = () => service.GetByIdAsync(otherUsersApp.Id);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task GetAsync_FiltersByUserAndStatus()
    {
        var (db, _, service, userId) = Build();
        db.JobApplications.AddRange(
            new JobApplication { UserId = userId, CompanyName = "A", Position = "p", Status = ApplicationStatus.Applied },
            new JobApplication { UserId = userId, CompanyName = "B", Position = "p", Status = ApplicationStatus.Rejected },
            new JobApplication { UserId = Guid.NewGuid(), CompanyName = "C", Position = "p", Status = ApplicationStatus.Applied }
        );
        await db.SaveChangesAsync();

        var result = await service.GetAsync(new JobApplicationQuery { Status = ApplicationStatus.Applied });

        result.TotalItems.Should().Be(1);
        result.Items.Single().CompanyName.Should().Be("A");
    }
}
