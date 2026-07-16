namespace Northward.Game.Application.DTOs;

public record GameSessionDto(
    Guid Id,
    Guid PlayerCharacterId,
    string Season,
    string CurrentScene,
    int Score,
    bool IsCompleted,
    DateTime StartedAt,
    DateTime? CompletedAt
);
