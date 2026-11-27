using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Northward.Leaderboard.Domain.Entities;

namespace Northward.Leaderboard.Infrastructure.Persistence.Configurations;

public class HiddenPlayerConfiguration : IEntityTypeConfiguration<HiddenPlayer>
{
    public void Configure(EntityTypeBuilder<HiddenPlayer> builder)
    {
        builder.HasKey(h => h.UserId);
        builder.Property(h => h.HiddenAt).IsRequired();
    }
}
