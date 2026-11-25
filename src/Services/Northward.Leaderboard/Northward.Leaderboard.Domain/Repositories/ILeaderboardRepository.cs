using Northward.Leaderboard.Domain.Entities;

namespace Northward.Leaderboard.Domain.Repositories;

public interface ILeaderboardRepository
{
    Task<List<LeaderboardEntry>> GetTopByScoreAsync(int limit, string? season = null);
    Task<List<LeaderboardEntry>> GetTopByTimeAsync(int limit, string? season = null);
    Task<List<LeaderboardEntry>> GetByUserIdAsync(Guid userId);
    Task<LeaderboardStats> GetStatsAsync();
    Task<int> CountByUserSinceAsync(Guid userId, DateTime since);
    Task AddAsync(LeaderboardEntry entry);
    Task DeleteByUserIdAsync(Guid userId);
    Task SaveChangesAsync();
}
