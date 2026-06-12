using Northward.Game.Application.DTOs;
using Northward.Game.Domain.Entities;
using Northward.Game.Domain.Repositories;

namespace Northward.Game.Application.Services;

public class PlayerCharacterService : IPlayerCharacterService
{
    private readonly IPlayerCharacterRepository _playerCharacterRepository;

    public PlayerCharacterService(IPlayerCharacterRepository playerCharacterRepository)
    {
        _playerCharacterRepository = playerCharacterRepository;
    }

    public async Task<PlayerCharacterDto> CreateAsync(Guid userId, CreatePlayerCharacterDto dto)
    {
        var playerCharacter = PlayerCharacter.Create(userId, dto.CharacterType, dto.CustomName);
        await _playerCharacterRepository.AddAsync(playerCharacter);
        return MapToDto(playerCharacter);
    }

    public async Task<List<PlayerCharacterDto>> GetByUserIdAsync(Guid userId)
    {
        var characters = await _playerCharacterRepository.GetByUserIdAsync(userId);
        return characters.Select(MapToDto).ToList();
    }

    public async Task<PlayerCharacterDto> UnlockKnightAsync(Guid userId)
    {
        var characters = await _playerCharacterRepository.GetByUserIdAsync(userId);
        var knight = characters.FirstOrDefault(c => c.CharacterType == CharacterTypes.Knight);

        if (knight == null)
            throw new Exception("knight character not found");

        knight.Unlock();
        await _playerCharacterRepository.UpdateAsync(knight);
        return MapToDto(knight);
    }

    public async Task<PlayerCharacterDto> RenameAsync(Guid userId, Guid characterId, string newName)
    {
        var character = await _playerCharacterRepository.GetByIdAsync(characterId);

        if (character == null || character.UserId != userId)
            throw new Exception("character not found");

        character.Rename(newName);
        await _playerCharacterRepository.UpdateAsync(character);
        return MapToDto(character);
    }

    private static PlayerCharacterDto MapToDto(PlayerCharacter playerCharacter)
    {
        return new PlayerCharacterDto
        {
            Id = playerCharacter.Id,
            CharacterType = playerCharacter.CharacterType,
            CustomName = playerCharacter.CustomName,
            IsUnlocked = playerCharacter.IsUnlocked,
            CreatedAt = playerCharacter.CreatedAt
        };
    }
}