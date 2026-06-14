using Northward.Leaderboard.Application.DTOs;

namespace Northward.Leaderboard.Application.Interfaces;

public interface ILeaderboardService
{
    Task<LeaderboardEntryDto> SubmitAsync(Guid userId, SubmitEntryRequestDto request);
    Task<List<LeaderboardEntryDto>> GetTopByScoreAsync(int limit, string? season);
    Task<List<LeaderboardEntryDto>> GetTopByTimeAsync(int limit, string? season);
    Task<List<LeaderboardEntryDto>> GetMyEntriesAsync(Guid userId);
}
