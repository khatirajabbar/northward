using Northward.Game.Application.DTOs;

namespace Northward.Game.Application.Services;

public interface IPlayerCharacterService
{
    Task<PlayerCharacterDto> CreateAsync(Guid userId, CreatePlayerCharacterDto dto);
    Task<List<PlayerCharacterDto>> GetByUserIdAsync(Guid userId);
    Task<PlayerCharacterDto> UnlockKnightAsync(Guid userId);
    Task<PlayerCharacterDto> RenameAsync(Guid userId, Guid characterId, string newName);
}