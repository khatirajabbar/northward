namespace Northward.Game.Application.DTOs;

public record GameSessionDto(
    Guid Id,
    Guid PlayerCharacterId,
    string Season,
    int Score,
    bool IsCompleted,
    DateTime StartedAt,
    DateTime? CompletedAt
);
