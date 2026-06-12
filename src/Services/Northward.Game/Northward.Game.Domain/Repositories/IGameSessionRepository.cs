using Northward.Game.Domain.Entities;

namespace Northward.Game.Domain.Repositories;

public interface IGameSessionRepository
{
    Task<GameSession?> GetByIdAsync(Guid id);
    Task<List<GameSession>> GetByUserIdAsync(Guid userId);
    Task AddAsync(GameSession gameSession);
    Task UpdateAsync(GameSession gameSession);
}