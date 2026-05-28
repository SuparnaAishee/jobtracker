using JobTrackr.Application.Common.Interfaces;
using JobTrackr.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobTrackr.Infrastructure.Persistence;

public class ApplicationDbContext : DbContext, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<JobApplication> JobApplications => Set<JobApplication>();
    public DbSet<InterviewEvent> InterviewEvents => Set<InterviewEvent>();
    public DbSet<Resume> Resumes => Set<Resume>();
    public DbSet<PrepSession> PrepSessions => Set<PrepSession>();
    public DbSet<PrepQuestion> PrepQuestions => Set<PrepQuestion>();
    public DbSet<PrepAttempt> PrepAttempts => Set<PrepAttempt>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
