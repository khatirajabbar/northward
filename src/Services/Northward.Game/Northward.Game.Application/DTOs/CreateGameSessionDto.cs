namespace Northward.Game.Application.DTOs;

public record CreateGameSessionDto(
    Guid PlayerCharacterId,
    string Season
);
