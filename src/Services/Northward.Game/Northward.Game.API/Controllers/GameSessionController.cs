using Microsoft.AspNetCore.Mvc;
using Northward.Game.Application.DTOs;
using Northward.Game.Application.Services;

namespace Northward.Game.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GameSessionController : ControllerBase
{
    private readonly IGameSessionService _gameSessionService;

    public GameSessionController(IGameSessionService gameSessionService)
    {
        _gameSessionService = gameSessionService;
    }

    [HttpPost("{userId:guid}")]
    public async Task<IActionResult> Start(Guid userId, [FromBody] CreateGameSessionDto dto)
    {
        var result = await _gameSessionService.StartAsync(userId, dto);
        return Created(string.Empty, result);
    }

    [HttpGet("{userId:guid}")]
    public async Task<IActionResult> GetByUserId(Guid userId)
    {
        var result = await _gameSessionService.GetByUserIdAsync(userId);
        return Ok(result);
    }

    [HttpPatch("{userId:guid}/{sessionId:guid}/add-score")]
    public async Task<IActionResult> AddScore(Guid userId, Guid sessionId, [FromBody] int points)
    {
        var result = await _gameSessionService.AddScoreAsync(userId, sessionId, points);
        return Ok(result);
    }

    [HttpPatch("{userId:guid}/{sessionId:guid}/complete")]
    public async Task<IActionResult> Complete(Guid userId, Guid sessionId)
    {
        var result = await _gameSessionService.CompleteAsync(userId, sessionId);
        return Ok(result);
    }
}