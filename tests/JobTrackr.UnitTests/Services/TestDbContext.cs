using JobTrackr.Application.Common.Interfaces;
using JobTrackr.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobTrackr.UnitTests.Services;

public class TestDbContext : DbContext, IApplicationDbContext
{
    public TestDbContext(DbContextOptions<TestDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<JobApplication> JobApplications => Set<JobApplication>();
    public DbSet<InterviewEvent> InterviewEvents => Set<InterviewEvent>();
    public DbSet<Resume> Resumes => Set<Resume>();
}
