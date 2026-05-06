using JobTrackr.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace JobTrackr.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<JobApplication> JobApplications { get; }
    DbSet<InterviewEvent> InterviewEvents { get; }
    DbSet<Resume> Resumes { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
