using Microsoft.EntityFrameworkCore;
using Northward.Leaderboard.Domain.Entities;

namespace Northward.Leaderboard.Infrastructure.Persistence;

public class LeaderboardDbContext : DbContext
{
    public LeaderboardDbContext(DbContextOptions<LeaderboardDbContext> options) : base(options) { }

    public DbSet<LeaderboardEntry> LeaderboardEntries => Set<LeaderboardEntry>();
    public DbSet<HiddenPlayer> HiddenPlayers => Set<HiddenPlayer>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(LeaderboardDbContext).Assembly);
    }
}
