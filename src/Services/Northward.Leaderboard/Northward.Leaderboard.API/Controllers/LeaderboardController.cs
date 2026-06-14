using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Northward.Leaderboard.Application.DTOs;
using Northward.Leaderboard.Application.Interfaces;

namespace Northward.Leaderboard.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class LeaderboardController : ControllerBase
{
    private readonly ILeaderboardService _leaderboardService;

    public LeaderboardController(ILeaderboardService leaderboardService)
    {
        _leaderboardService = leaderboardService;
    }

    /// <summary>
    /// Get top entries sorted by score (highest first). Public.
    /// </summary>
    /// <param name="limit">Maximum entries to return (default 10, max 100)</param>
    /// <param name="season">Optional filter: "summer" or "winter". Omit for all seasons.</param>
    [HttpGet("top-scores")]
    public async Task<IActionResult> GetTopScores(
        [FromQuery] int limit = 10,
        [FromQuery] string? season = null)
    {
        limit = Math.Clamp(limit, 1, 100);
        var entries = await _leaderboardService.GetTopByScoreAsync(limit, season);
        return Ok(entries);
    }

    /// <summary>
    /// Get top entries sorted by completion time (fastest first). Public.
    /// </summary>
    /// <param name="limit">Maximum entries to return (default 10, max 100)</param>
    /// <param name="season">Optional filter: "summer" or "winter". Omit for all seasons.</param>
    [HttpGet("top-times")]
    public async Task<IActionResult> GetTopTimes(
        [FromQuery] int limit = 10,
        [FromQuery] string? season = null)
    {
        limit = Math.Clamp(limit, 1, 100);
        var entries = await _leaderboardService.GetTopByTimeAsync(limit, season);
        return Ok(entries);
    }

    /// <summary>
    /// Get the authenticated user's own leaderboard entries.
    /// </summary>
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMyEntries()
    {
        var userId = GetUserId();
        var entries = await _leaderboardService.GetMyEntriesAsync(userId);
        return Ok(entries);
    }

    /// <summary>
    /// Submit a new leaderboard entry for the authenticated user.
    /// </summary>
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] SubmitEntryRequestDto request)
    {
        var userId = GetUserId();
        var entry = await _leaderboardService.SubmitAsync(userId, request);
        return Created(string.Empty, entry);
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.Parse(userIdClaim!);
    }
}
