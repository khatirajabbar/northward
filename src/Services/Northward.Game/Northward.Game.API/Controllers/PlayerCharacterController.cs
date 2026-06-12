using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Northward.Game.Application.DTOs;
using Northward.Game.Application.Services;

namespace Northward.Game.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class PlayerCharacterController : ControllerBase
{
    private readonly IPlayerCharacterService _playerCharacterService;

    public PlayerCharacterController(IPlayerCharacterService playerCharacterService)
    {
        _playerCharacterService = playerCharacterService;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePlayerCharacterDto dto)
    {
        var userId = GetUserId();
        var result = await _playerCharacterService.CreateAsync(userId, dto);
        return Created(string.Empty, result);
    }

    [HttpGet]
    public async Task<IActionResult> GetMyCharacters()
    {
        var userId = GetUserId();
        var result = await _playerCharacterService.GetByUserIdAsync(userId);
        return Ok(result);
    }

    [HttpPatch("unlock-knight")]
    public async Task<IActionResult> UnlockKnight()
    {
        var userId = GetUserId();
        var result = await _playerCharacterService.UnlockKnightAsync(userId);
        return Ok(result);
    }

    [HttpPatch("{characterId:guid}/rename")]
    public async Task<IActionResult> Rename(Guid characterId, [FromBody] string newName)
    {
        var userId = GetUserId();
        var result = await _playerCharacterService.RenameAsync(userId, characterId, newName);
        return Ok(result);
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.Parse(userIdClaim!);
    }
}