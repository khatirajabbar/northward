using Northward.Leaderboard.Application.DTOs;
using Northward.Leaderboard.Application.Interfaces;
using Northward.Leaderboard.Domain.Entities;
using Northward.Leaderboard.Domain.Repositories;

namespace Northward.Leaderboard.Application.Services;

public class LeaderboardService : ILeaderboardService
{
    private readonly ILeaderboardRepository _leaderboardRepository;

    public LeaderboardService(ILeaderboardRepository leaderboardRepository)
    {
        _leaderboardRepository = leaderboardRepository;
    }

    public async Task<LeaderboardEntryDto> SubmitAsync(Guid userId, SubmitEntryRequestDto request)
    {
        var entry = LeaderboardEntry.Create(
            userId,
            request.Username,
            request.CharacterType,
            request.Season,
            request.Score,
            request.CompletionTime);

        await _leaderboardRepository.AddAsync(entry);
        await _leaderboardRepository.SaveChangesAsync();

        return MapToDto(entry, rank: null);
    }

    public async Task<List<LeaderboardEntryDto>> GetTopByScoreAsync(int limit, string? season)
    {
        var entries = await _leaderboardRepository.GetTopByScoreAsync(limit, season);
        return entries.Select((e, i) => MapToDto(e, rank: i + 1)).ToList();
    }

    public async Task<List<LeaderboardEntryDto>> GetTopByTimeAsync(int limit, string? season)
    {
        var entries = await _leaderboardRepository.GetTopByTimeAsync(limit, season);
        return entries.Select((e, i) => MapToDto(e, rank: i + 1)).ToList();
    }

    public async Task<List<LeaderboardEntryDto>> GetMyEntriesAsync(Guid userId)
    {
        var entries = await _leaderboardRepository.GetByUserIdAsync(userId);
        return entries.Select(e => MapToDto(e, rank: null)).ToList();
    }

    private static LeaderboardEntryDto MapToDto(LeaderboardEntry entry, int? rank)
    {
        return new LeaderboardEntryDto(
            Id: entry.Id,
            UserId: entry.UserId,
            Username: entry.Username,
            CharacterType: entry.CharacterType,
            Season: entry.Season,
            Score: entry.Score,
            CompletionTime: entry.CompletionTime,
            CompletedAt: entry.CompletedAt,
            Rank: rank
        );
    }
}
