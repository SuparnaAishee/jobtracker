using JobTrackr.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobTrackr.Infrastructure.Persistence.Configurations;

public class JobApplicationConfiguration : IEntityTypeConfiguration<JobApplication>
{
    public void Configure(EntityTypeBuilder<JobApplication> builder)
    {
        builder.ToTable("job_applications");
        builder.HasKey(j => j.Id);

        builder.Property(j => j.CompanyName).HasMaxLength(200).IsRequired();
        builder.Property(j => j.Position).HasMaxLength(200).IsRequired();
        builder.Property(j => j.Location).HasMaxLength(200);
        builder.Property(j => j.JobUrl).HasMaxLength(2000);
        builder.Property(j => j.Notes).HasMaxLength(4000);
        builder.Property(j => j.SalaryMin).HasColumnType("numeric(12,2)");
        builder.Property(j => j.SalaryMax).HasColumnType("numeric(12,2)");
        builder.Property(j => j.Status).HasConversion<int>();

        builder.HasOne(j => j.User)
            .WithMany(u => u.JobApplications)
            .HasForeignKey(j => j.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(j => new { j.UserId, j.Status });
        builder.HasIndex(j => new { j.UserId, j.AppliedOn });
    }
}
