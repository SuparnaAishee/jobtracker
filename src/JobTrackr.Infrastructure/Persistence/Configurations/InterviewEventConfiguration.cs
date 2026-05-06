using JobTrackr.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobTrackr.Infrastructure.Persistence.Configurations;

public class InterviewEventConfiguration : IEntityTypeConfiguration<InterviewEvent>
{
    public void Configure(EntityTypeBuilder<InterviewEvent> builder)
    {
        builder.ToTable("interview_events");
        builder.HasKey(e => e.Id);

        builder.Property(e => e.Title).HasMaxLength(200).IsRequired();
        builder.Property(e => e.Interviewer).HasMaxLength(200);
        builder.Property(e => e.Notes).HasMaxLength(4000);

        builder.HasOne(e => e.JobApplication)
            .WithMany(j => j.InterviewEvents)
            .HasForeignKey(e => e.JobApplicationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(e => new { e.JobApplicationId, e.ScheduledAt });
    }
}
