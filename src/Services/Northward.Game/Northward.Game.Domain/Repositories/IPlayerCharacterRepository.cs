namespace Northward.Game.Domain.Repositories;
using Northward.Game.Domain.Entities;

public interface IPlayerCharacterRepository
{
    Task<PlayerCharacter?> GetByIdAsync(Guid id);
    Task<List<PlayerCharacter>> GetByUserIdAsync(Guid userId);
    Task AddAsync(PlayerCharacter playerCharacter);
    Task UpdateAsync(PlayerCharacter playerCharacter);
}