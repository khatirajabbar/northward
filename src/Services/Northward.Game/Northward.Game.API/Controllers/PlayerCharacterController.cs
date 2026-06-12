using Microsoft.AspNetCore.Mvc;
using Northward.Game.Application.DTOs;
using Northward.Game.Application.Services;

namespace Northward.Game.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PlayerCharacterController : ControllerBase
{
    private readonly IPlayerCharacterService _playerCharacterService;

    public PlayerCharacterController(IPlayerCharacterService playerCharacterService)
    {
        _playerCharacterService = playerCharacterService;
    }

    [HttpPost("{userId:guid}")]
    public async Task<IActionResult> Create(Guid userId, [FromBody] CreatePlayerCharacterDto dto)
    {
        var result = await _playerCharacterService.CreateAsync(userId, dto);
        return Created(string.Empty, result);
    }

    [HttpGet("{userId:guid}")]
    public async Task<IActionResult> GetByUserId(Guid userId)
    {
        var result = await _playerCharacterService.GetByUserIdAsync(userId);
        return Ok(result);
    }

    [HttpPatch("{userId:guid}/unlock-knight")]
    public async Task<IActionResult> UnlockKnight(Guid userId)
    {
        var result = await _playerCharacterService.UnlockKnightAsync(userId);
        return Ok(result);
    }

    [HttpPatch("{userId:guid}/{characterId:guid}/rename")]
    public async Task<IActionResult> Rename(Guid userId, Guid characterId, [FromBody] string newName)
    {
        var result = await _playerCharacterService.RenameAsync(userId, characterId, newName);
        return Ok(result);
    }
}