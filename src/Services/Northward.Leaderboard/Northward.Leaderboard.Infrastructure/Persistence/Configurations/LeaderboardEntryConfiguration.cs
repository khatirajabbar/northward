using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Northward.Leaderboard.Domain.Entities;

namespace Northward.Leaderboard.Infrastructure.Persistence.Configurations;

public class LeaderboardEntryConfiguration : IEntityTypeConfiguration<LeaderboardEntry>
{
    public void Configure(EntityTypeBuilder<LeaderboardEntry> builder)
    {
        builder.HasKey(e => e.Id);

        builder.Property(e => e.UserId)
            .IsRequired();

        builder.Property(e => e.Username)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(e => e.CharacterType)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(e => e.Season)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(e => e.Score)
            .IsRequired();

        builder.Property(e => e.CompletionTime)
            .IsRequired();

        builder.Property(e => e.CompletedAt)
            .IsRequired();

        builder.HasIndex(e => e.UserId);
        builder.HasIndex(e => e.Score);
        builder.HasIndex(e => e.Season);
    }
}
