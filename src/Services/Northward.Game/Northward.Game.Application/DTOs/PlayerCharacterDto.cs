namespace Northward.Game.Application.DTOs;

public record PlayerCharacterDto(
    Guid Id,
    string CharacterType,
    string CustomName,
    bool IsUnlocked,
    DateTime CreatedAt
);
