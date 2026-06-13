using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Northward.Game.Domain.Entities;

namespace Northward.Game.Infrastructure.Persistence.Configurations;

public class GameSessionConfiguration : IEntityTypeConfiguration<GameSession>
{
    public void Configure(EntityTypeBuilder<GameSession> builder)
    {
        builder.HasKey(gs => gs.Id);

        builder.Property(gs => gs.UserId)
            .IsRequired();

        builder.Property(gs => gs.PlayerCharacterId)
            .IsRequired();

        builder.Property(gs => gs.Season)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(gs => gs.Score)
            .IsRequired();

        builder.Property(gs => gs.IsCompleted)
            .IsRequired();

        builder.Property(gs => gs.StartedAt)
            .IsRequired();

        builder.Property(gs => gs.CompletedAt)
            .IsRequired(false);

        builder.HasIndex(gs => gs.UserId);
        builder.HasIndex(gs => gs.PlayerCharacterId);
    }
}