using JobTrackr.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobTrackr.Infrastructure.Persistence.Configurations;

public class PrepAttemptConfiguration : IEntityTypeConfiguration<PrepAttempt>
{
    public void Configure(EntityTypeBuilder<PrepAttempt> builder)
    {
        builder.ToTable("prep_attempts");
        builder.HasKey(a => a.Id);

        builder.Property(a => a.AnswerText).HasColumnType("text").IsRequired();
        builder.Property(a => a.StrengthsJson).HasColumnType("text");
        builder.Property(a => a.ImprovementsJson).HasColumnType("text");
        builder.Property(a => a.ModelAnswer).HasColumnType("text");

        builder.HasIndex(a => new { a.QuestionId, a.CreatedAt });
    }
}
