using JobTrackr.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobTrackr.Infrastructure.Persistence.Configurations;

public class PrepQuestionConfiguration : IEntityTypeConfiguration<PrepQuestion>
{
    public void Configure(EntityTypeBuilder<PrepQuestion> builder)
    {
        builder.ToTable("prep_questions");
        builder.HasKey(q => q.Id);

        builder.Property(q => q.Question).HasColumnType("text").IsRequired();
        builder.Property(q => q.Category).HasMaxLength(50).IsRequired();
        builder.Property(q => q.Difficulty).HasMaxLength(20).IsRequired();
        builder.Property(q => q.WhyAsked).HasColumnType("text");
        builder.Property(q => q.ModelAnswer).HasColumnType("text");
        builder.Property(q => q.Mastery).HasConversion<int>();

        builder.HasMany(q => q.Attempts)
            .WithOne(a => a.Question)
            .HasForeignKey(a => a.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(q => new { q.SessionId, q.Order });
    }
}
