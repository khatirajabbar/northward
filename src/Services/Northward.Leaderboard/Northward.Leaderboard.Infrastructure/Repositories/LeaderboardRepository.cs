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

    // the board everyone sees: every journey but those of players the admin has hidden
    private IQueryable<LeaderboardEntry> Shown =>
        _context.LeaderboardEntries.Where(e => !_context.HiddenPlayers.Any(h => h.UserId == e.UserId));

    public async Task<List<LeaderboardEntry>> GetTopByScoreAsync(int limit, string? season = null)
    {
        var query = Shown;

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
        var query = Shown;

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
        var entries = Shown;
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
        await _context.HiddenPlayers.Where(h => h.UserId == userId).ExecuteDeleteAsync();
    }

    // everyone who has reached the end, newest arrival first, hidden or not.
    // (the board is small: read once, then put together here)
    public async Task<List<BoardPlayer>> GetPlayersAsync()
    {
        var journeys = await _context.LeaderboardEntries
            .Select(e => new { e.UserId, e.Username, e.Score, e.CompletionTime, e.CompletedAt })
            .ToListAsync();
        var hidden = (await _context.HiddenPlayers.Select(h => h.UserId).ToListAsync()).ToHashSet();

        return journeys
            .GroupBy(e => e.UserId)
            .Select(g =>
            {
                var latest = g.MaxBy(e => e.CompletedAt)!;
                return new BoardPlayer(g.Key, latest.Username, g.Count(), g.Max(e => e.Score),
                    g.Min(e => e.CompletionTime), latest.CompletedAt, hidden.Contains(g.Key));
            })
            .OrderByDescending(p => p.LastArrived)
            .ToList();
    }

    public async Task<bool> HasPlayerAsync(Guid userId)
    {
        return await _context.LeaderboardEntries.AnyAsync(e => e.UserId == userId);
    }

    public async Task SetHiddenAsync(Guid userId, bool hidden)
    {
        var already = await _context.HiddenPlayers.FindAsync(userId);
        if (hidden && already is null) await _context.HiddenPlayers.AddAsync(HiddenPlayer.Create(userId));
        if (!hidden && already is not null) _context.HiddenPlayers.Remove(already);
        await _context.SaveChangesAsync();
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}
