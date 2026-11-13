using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Northward.Auth.Application.DTOs;
using Northward.Auth.Application.Interfaces;
using Northward.Auth.Domain.Exceptions;

namespace Northward.Auth.API.Controllers;

// Messages from players (the website's "say something" page), and the admin
// page that reads them. A signed-in player can send; reading and deleting
// need the admin pass, which is given for the admin password (Admin:Password
// in the service's settings) and lasts a couple of hours. A message is shown
// on the website only if its writer agreed AND the admin chose it.
[ApiController]
[Route("api/[controller]")]
public class MessagesController : ControllerBase
{
    public const string AdminRole = "admin";
    private const int ShortestAdminPassword = 8;

    private readonly IMessageService _messageService;
    private readonly IJwtService _jwtService;
    private readonly IConfiguration _configuration;

    public MessagesController(IMessageService messageService, IJwtService jwtService, IConfiguration configuration)
    {
        _messageService = messageService;
        _jwtService = jwtService;
        _configuration = configuration;
    }

    /// <summary>
    /// Send a message, as the signed-in player.
    /// </summary>
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Send([FromBody] SendMessageRequestDto request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized(new { error = "Invalid authentication token." });

        try
        {
            await _messageService.SendAsync(userId, request.Text, request.MayShow);
            return NoContent();
        }
        catch (DomainException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Trade the admin password for an admin pass. Only a few tries a minute.
    /// </summary>
    [HttpPost("admin/enter")]
    [EnableRateLimiting("admin-enter")]
    public IActionResult EnterAdmin([FromBody] AdminEnterRequestDto request)
    {
        var password = _configuration["Admin:Password"];

        // no password chosen (or one too short to be safe): there is no admin page
        if (string.IsNullOrEmpty(password) || password.Length < ShortestAdminPassword)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = "The admin page isn't set up." });

        // compared in a way that takes the same time whether it's nearly right or not
        var given = SHA256.HashData(Encoding.UTF8.GetBytes(request.Password));
        var wanted = SHA256.HashData(Encoding.UTF8.GetBytes(password));
        if (!CryptographicOperations.FixedTimeEquals(given, wanted))
            return Unauthorized(new { error = "That password isn't right." });

        var pass = _jwtService.GenerateAdminToken();
        return Ok(new AdminPassDto(pass.Token, pass.ExpiresAt));
    }

    /// <summary>
    /// Every message, newest first. Admin only.
    /// </summary>
    [Authorize(Roles = AdminRole)]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await _messageService.GetAllAsync());
    }

    /// <summary>
    /// The messages shown on the website: name and words only. Public.
    /// </summary>
    [HttpGet("shown")]
    public async Task<IActionResult> GetShown()
    {
        return Ok(await _messageService.GetShownAsync());
    }

    /// <summary>
    /// Put a message on the website, or take it off. Admin only, and only
    /// for a message whose writer agreed to it being shown.
    /// </summary>
    [Authorize(Roles = AdminRole)]
    [HttpPut("{id:guid}/shown")]
    public async Task<IActionResult> SetShown(Guid id, [FromBody] SetShownRequestDto request)
    {
        try
        {
            return await _messageService.SetShownAsync(id, request.Shown) ? NoContent() : NotFound(new { error = "Message not found." });
        }
        catch (DomainException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Delete one message. Admin only.
    /// </summary>
    [Authorize(Roles = AdminRole)]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        return await _messageService.DeleteAsync(id) ? NoContent() : NotFound(new { error = "Message not found." });
    }
}
