using JobTrackr.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobTrackr.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<JobApplication> JobApplications { get; }
    DbSet<InterviewEvent> InterviewEvents { get; }
    DbSet<Resume> Resumes { get; }
    DbSet<PrepSession> PrepSessions { get; }
    DbSet<PrepQuestion> PrepQuestions { get; }
    DbSet<PrepAttempt> PrepAttempts { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
