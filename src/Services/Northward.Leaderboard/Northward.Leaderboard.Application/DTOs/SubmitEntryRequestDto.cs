namespace Northward.Leaderboard.Application.DTOs;

public record SubmitEntryRequestDto(
    string CharacterType,
    string Season,
    int Score,
    TimeSpan CompletionTime
);