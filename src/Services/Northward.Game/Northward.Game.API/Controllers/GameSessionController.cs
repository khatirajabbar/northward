using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Northward.Game.Application.DTOs;
using Northward.Game.Application.Interfaces;

namespace Northward.Game.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class GameSessionController : ControllerBase
{
    private readonly IGameSessionService _gameSessionService;

    public GameSessionController(IGameSessionService gameSessionService)
    {
        _gameSessionService = gameSessionService;
    }

    [HttpPost]
    public async Task<IActionResult> Start([FromBody] CreateGameSessionDto dto)
    {
        var userId = GetUserId();
        var result = await _gameSessionService.StartAsync(userId, dto);
        return Created(string.Empty, result);
    }

    [HttpGet]
    public async Task<IActionResult> GetMySessions()
    {
        var userId = GetUserId();
        var result = await _gameSessionService.GetByUserIdAsync(userId);
        return Ok(result);
    }

    [HttpPatch("{sessionId:guid}/add-score")]
    public async Task<IActionResult> AddScore(Guid sessionId, [FromBody] int points)
    {
        var userId = GetUserId();
        var result = await _gameSessionService.AddScoreAsync(userId, sessionId, points);
        return Ok(result);
    }

    [HttpPatch("{sessionId:guid}/progress")]
    public async Task<IActionResult> UpdateProgress(Guid sessionId, [FromBody] UpdateProgressDto dto)
    {
        var userId = GetUserId();
        var result = await _gameSessionService.UpdateProgressAsync(userId, sessionId, dto);
        return Ok(result);
    }

    [HttpPatch("{sessionId:guid}/complete")]
    public async Task<IActionResult> Complete(Guid sessionId)
    {
        var userId = GetUserId();
        var result = await _gameSessionService.CompleteAsync(userId, sessionId);
        return Ok(result);
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.Parse(userIdClaim!);
    }
}