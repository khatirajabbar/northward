using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Northward.Game.Domain.Entities;

namespace Northward.Game.Infrastructure.Persistence.Configurations;

public class PlayerCharacterConfiguration : IEntityTypeConfiguration<PlayerCharacter>
{
    public void Configure(EntityTypeBuilder<PlayerCharacter> builder)
    {
        builder.HasKey(pc => pc.Id);

        builder.Property(pc => pc.UserId)
            .IsRequired();

        builder.Property(pc => pc.CharacterType)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(pc => pc.CustomName)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(pc => pc.IsUnlocked)
            .IsRequired();

        builder.Property(pc => pc.CreatedAt)
            .IsRequired();

        builder.HasIndex(pc => pc.UserId);
    }
}