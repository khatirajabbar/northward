using Northward.Leaderboard.Domain.Entities;

namespace Northward.Leaderboard.Domain.Repositories;

public interface ILeaderboardRepository
{
    Task<List<LeaderboardEntry>> GetTopByScoreAsync(int limit, string? season = null);
    Task<List<LeaderboardEntry>> GetTopByTimeAsync(int limit, string? season = null);
    Task<List<LeaderboardEntry>> GetByUserIdAsync(Guid userId);
    Task AddAsync(LeaderboardEntry entry);
    Task SaveChangesAsync();
}
