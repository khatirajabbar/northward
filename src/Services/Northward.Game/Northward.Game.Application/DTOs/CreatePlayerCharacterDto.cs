namespace Northward.Game.Application.DTOs;

public record CreatePlayerCharacterDto(
    string CharacterType,
    string CustomName
);
