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
    /// The board in a few numbers: how many reached the end, the kindest, the quickest. Public.
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        return Ok(await _leaderboardService.GetStatsAsync());
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
    /// The username is taken from the verified JWT, not the request body,
    /// so a user can only ever submit under their own account name.
    /// </summary>
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] SubmitEntryRequestDto request)
    {
        var userId = GetUserId();
        var username = GetUsername();
        var entry = await _leaderboardService.SubmitAsync(userId, username, request);
        return Created(string.Empty, entry);
    }

    /// <summary>
    /// Delete every leaderboard entry of the signed-in user
    /// (part of deleting their account).
    /// </summary>
    [Authorize]
    [HttpDelete("me")]
    public async Task<IActionResult> DeleteMyEntries()
    {
        var userId = GetUserId();
        await _leaderboardService.DeleteMyEntriesAsync(userId);
        return NoContent();
    }

    // ── the admin page (the admin pass comes from the sign-in service's
    // admin password; see its MessagesController) ──

    /// <summary>
    /// Everyone who has reached the end, newest first, and whether the board shows them. Admin only.
    /// </summary>
    [Authorize(Roles = AdminRole)]
    [HttpGet("admin/players")]
    public async Task<IActionResult> GetPlayers()
    {
        return Ok(await _leaderboardService.GetPlayersAsync());
    }

    /// <summary>
    /// Take a player off the public board, or put them back. Their journeys and account are kept. Admin only.
    /// </summary>
    [Authorize(Roles = AdminRole)]
    [HttpPut("admin/players/{userId:guid}/hidden")]
    public async Task<IActionResult> SetHidden(Guid userId, [FromBody] SetHiddenRequestDto request)
    {
        return await _leaderboardService.SetHiddenAsync(userId, request.Hidden) ? NoContent() : NotFound(new { error = "Player not found." });
    }

    private const string AdminRole = "admin";

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.Parse(userIdClaim!);
    }

    private string GetUsername()
    {
        return User.FindFirstValue(ClaimTypes.Name)!;
    }
}