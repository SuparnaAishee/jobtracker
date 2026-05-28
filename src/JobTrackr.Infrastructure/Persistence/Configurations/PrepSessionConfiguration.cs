using JobTrackr.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobTrackr.Infrastructure.Persistence.Configurations;

public class PrepSessionConfiguration : IEntityTypeConfiguration<PrepSession>
{
    public void Configure(EntityTypeBuilder<PrepSession> builder)
    {
        builder.ToTable("prep_sessions");
        builder.HasKey(s => s.Id);

        builder.Property(s => s.Title).HasMaxLength(200).IsRequired();
        builder.Property(s => s.CompanyName).HasMaxLength(200);
        builder.Property(s => s.Position).HasMaxLength(200);
        builder.Property(s => s.JobDescriptionSnapshot).HasColumnType("text");
        builder.Property(s => s.Mode).HasConversion<int>();

        builder.HasOne(s => s.User)
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(s => s.JobApplication)
            .WithMany()
            .HasForeignKey(s => s.JobApplicationId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(s => s.Questions)
            .WithOne(q => q.Session)
            .HasForeignKey(q => q.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(s => new { s.UserId, s.CreatedAt });
    }
}
