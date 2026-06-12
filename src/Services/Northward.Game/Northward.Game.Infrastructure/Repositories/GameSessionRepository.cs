using Microsoft.EntityFrameworkCore;
using Northward.Game.Domain.Entities;
using Northward.Game.Domain.Repositories;
using Northward.Game.Infrastructure.Data;

namespace Northward.Game.Infrastructure.Repositories;

public class GameSessionRepository : IGameSessionRepository
{
    private readonly GameDbContext _context;

    public GameSessionRepository(GameDbContext context)
    {
        _context = context;
    }

    public async Task<GameSession?> GetByIdAsync(Guid id)
    {
        return await _context.GameSessions.FindAsync(id);
    }

    public async Task<List<GameSession>> GetByUserIdAsync(Guid userId)
    {
        return await _context.GameSessions
            .Where(gs => gs.UserId == userId)
            .ToListAsync();
    }

    public async Task AddAsync(GameSession gameSession)
    {
        await _context.GameSessions.AddAsync(gameSession);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(GameSession gameSession)
    {
        _context.GameSessions.Update(gameSession);
        await _context.SaveChangesAsync();
    }
}