using System.Net.Http.Json;

namespace Northward.WebApp.Services;

public class LeaderboardApiClient
{
    private readonly IHttpClientFactory _httpClientFactory;

    public LeaderboardApiClient(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public async Task<List<LeaderboardEntry>> GetTopScoresAsync(int limit = 10, string? season = null)
    {
        var client = _httpClientFactory.CreateClient("LeaderboardApi");
        var url = $"api/leaderboard/top-scores?limit={limit}";
        if (!string.IsNullOrWhiteSpace(season)) url += $"&season={season}";

        try
        {
            var entries = await client.GetFromJsonAsync<List<LeaderboardEntry>>(url);
            return entries ?? new List<LeaderboardEntry>();
        }
        catch
        {
            return new List<LeaderboardEntry>();
        }
    }

    public async Task<List<LeaderboardEntry>> GetTopTimesAsync(int limit = 10, string? season = null)
    {
        var client = _httpClientFactory.CreateClient("LeaderboardApi");
        var url = $"api/leaderboard/top-times?limit={limit}";
        if (!string.IsNullOrWhiteSpace(season)) url += $"&season={season}";

        try
        {
            var entries = await client.GetFromJsonAsync<List<LeaderboardEntry>>(url);
            return entries ?? new List<LeaderboardEntry>();
        }
        catch
        {
            return new List<LeaderboardEntry>();
        }
    }
}

public record LeaderboardEntry(
    Guid Id,
    Guid UserId,
    string Username,
    string CharacterType,
    string Season,
    int Score,
    TimeSpan CompletionTime,
    DateTime CompletedAt,
    int? Rank);
