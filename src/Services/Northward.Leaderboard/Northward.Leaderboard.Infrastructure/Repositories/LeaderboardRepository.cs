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

        // each player once, with their kindest journey: one is left out when the
        // same player has a kinder one (or as kind and quicker, or the same and earlier)
        var all = query;
        return await query
            .Where(e => !all.Any(o => o.UserId == e.UserId && o.Id != e.Id &&
                (o.Score > e.Score ||
                 (o.Score == e.Score && (o.CompletionTime < e.CompletionTime ||
                  (o.CompletionTime == e.CompletionTime && o.CompletedAt < e.CompletedAt))))))
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

        // each player once, with their quickest journey: one is left out when the
        // same player has a quicker one (or as quick and kinder, or the same and earlier)
        var all = query;
        return await query
            .Where(e => !all.Any(o => o.UserId == e.UserId && o.Id != e.Id &&
                (o.CompletionTime < e.CompletionTime ||
                 (o.CompletionTime == e.CompletionTime && (o.Score > e.Score ||
                  (o.Score == e.Score && o.CompletedAt < e.CompletedAt))))))
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

    public async Task<int> CountByUserSinceAsync(Guid userId, DateTime since)
    {
        return await _context.LeaderboardEntries.CountAsync(e => e.UserId == userId && e.CompletedAt >= since);
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
