using Microsoft.EntityFrameworkCore;
using Northward.Game.Domain.Entities;

namespace Northward.Game.Infrastructure.Persistence;

public class GameDbContext : DbContext
{
    public GameDbContext(DbContextOptions<GameDbContext> options) : base(options) { }

    public DbSet<PlayerCharacter> PlayerCharacters => Set<PlayerCharacter>();
    public DbSet<GameSession> GameSessions => Set<GameSession>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(GameDbContext).Assembly);
    }
}