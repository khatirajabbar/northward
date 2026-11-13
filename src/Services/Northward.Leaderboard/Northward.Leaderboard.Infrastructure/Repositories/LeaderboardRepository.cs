using Microsoft.EntityFrameworkCore;
using Northward.Leaderboard.Domain.Entities;
using Northward.Leaderboard.Domain.Repositories;
using Northward.Leaderboard.Infrastructure.Persistence;

namespace Northward.Leaderboard.Infrastructure.Repositories;

public class LeaderboardRepository : ILeaderboardRepository
{
    private readonly LeaderboardDbContext _context;

    public LeaderboardRepository(LeaderboardDbContext context)
    {
        _context = context;
    }

    public async Task<List<LeaderboardEntry>> GetTopByScoreAsync(int limit, string? season = null)
    {
        var query = _context.LeaderboardEntries.AsQueryable();

        if (!string.IsNullOrWhiteSpace(season))
            query = query.Where(e => e.Season == season);

        return await query
            .OrderByDescending(e => e.Score)
            .ThenBy(e => e.CompletionTime)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<List<LeaderboardEntry>> GetTopByTimeAsync(int limit, string? season = null)
    {
        var query = _context.LeaderboardEntries.AsQueryable();

        if (!string.IsNullOrWhiteSpace(season))
            query = query.Where(e => e.Season == season);

        return await query
            .OrderBy(e => e.CompletionTime)
            .ThenByDescending(e => e.Score)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<List<LeaderboardEntry>> GetByUserIdAsync(Guid userId)
    {
        return await _context.LeaderboardEntries
            .Where(e => e.UserId == userId)
            .OrderByDescending(e => e.CompletedAt)
            .ToListAsync();
    }

    public async Task<LeaderboardStats> GetStatsAsync()
    {
        var entries = _context.LeaderboardEntries;
        var journeys = await entries.CountAsync();
        if (journeys == 0) return new LeaderboardStats(0, 0, null, null);

        return new LeaderboardStats(
            Travelers: await entries.Select(e => e.UserId).Distinct().CountAsync(),
            Journeys: journeys,
            Kindest: await entries.MaxAsync(e => e.Score),
            Quickest: await entries.MinAsync(e => e.CompletionTime));
    }

    public async Task AddAsync(LeaderboardEntry entry)
    {
        await _context.LeaderboardEntries.AddAsync(entry);
    }

    public async Task DeleteByUserIdAsync(Guid userId)
    {
        await _context.LeaderboardEntries.Where(e => e.UserId == userId).ExecuteDeleteAsync();
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}
