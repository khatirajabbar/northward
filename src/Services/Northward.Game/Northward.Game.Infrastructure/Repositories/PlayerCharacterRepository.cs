using Microsoft.EntityFrameworkCore;
using Northward.Game.Domain.Entities;
using Northward.Game.Domain.Repositories;
using Northward.Game.Infrastructure.Data;

namespace Northward.Game.Infrastructure.Repositories;

public class PlayerCharacterRepository : IPlayerCharacterRepository
{
    private readonly GameDbContext _context;

    public PlayerCharacterRepository(GameDbContext context)
    {
        _context = context;
    }

    public async Task<PlayerCharacter?> GetByIdAsync(Guid id)
    {
        return await _context.PlayerCharacters.FindAsync(id);
    }

    public async Task<List<PlayerCharacter>> GetByUserIdAsync(Guid userId)
    {
        return await _context.PlayerCharacters
            .Where(pc => pc.UserId == userId)
            .ToListAsync();
    }

    public async Task AddAsync(PlayerCharacter playerCharacter)
    {
        await _context.PlayerCharacters.AddAsync(playerCharacter);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(PlayerCharacter playerCharacter)
    {
        _context.PlayerCharacters.Update(playerCharacter);
        await _context.SaveChangesAsync();
    }
}