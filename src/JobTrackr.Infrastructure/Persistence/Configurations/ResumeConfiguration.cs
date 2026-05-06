using JobTrackr.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobTrackr.Infrastructure.Persistence.Configurations;

public class ResumeConfiguration : IEntityTypeConfiguration<Resume>
{
    public void Configure(EntityTypeBuilder<Resume> builder)
    {
        builder.ToTable("resumes");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.Label).HasMaxLength(120).IsRequired();
        builder.Property(r => r.OriginalFileName).HasMaxLength(260).IsRequired();
        builder.Property(r => r.ContentType).HasMaxLength(120).IsRequired();
        builder.Property(r => r.StorageKey).HasMaxLength(260).IsRequired();

        builder.HasOne(r => r.User)
            .WithMany(u => u.Resumes)
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(r => new { r.UserId, r.CreatedAt });
    }
}
