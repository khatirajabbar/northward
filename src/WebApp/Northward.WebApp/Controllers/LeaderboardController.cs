using Microsoft.AspNetCore.Mvc;
using Northward.WebApp.Services;

namespace Northward.WebApp.Controllers;

public class LeaderboardController : Controller
{
    private readonly LeaderboardApiClient _leaderboardApi;

    public LeaderboardController(LeaderboardApiClient leaderboardApi)
    {
        _leaderboardApi = leaderboardApi;
    }

    public async Task<IActionResult> Index(string? season = null, string sort = "time")
    {
        var entries = sort == "time"
            ? await _leaderboardApi.GetTopTimesAsync(20, season)
            : await _leaderboardApi.GetTopScoresAsync(20, season);

        ViewData["Season"] = season ?? "all";
        ViewData["Sort"] = sort;
        return View(entries);
    }
}
