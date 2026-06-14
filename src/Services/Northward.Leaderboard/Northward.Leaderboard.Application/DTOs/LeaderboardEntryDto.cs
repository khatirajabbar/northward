namespace Northward.Leaderboard.Application.DTOs;

public record LeaderboardEntryDto(
    Guid Id,
    Guid UserId,
    string Username,
    string CharacterType,
    string Season,
    int Score,
    TimeSpan CompletionTime,
    DateTime CompletedAt,
    int? Rank
);
