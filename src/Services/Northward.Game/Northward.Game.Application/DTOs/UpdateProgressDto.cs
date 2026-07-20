namespace Northward.Game.Application.DTOs;

public record UpdateProgressDto(
    string CurrentScene,
    int Score,
    string? Checkpoint
);
