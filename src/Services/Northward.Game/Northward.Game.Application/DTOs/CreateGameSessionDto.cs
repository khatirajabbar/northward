namespace Northward.Game.Application.DTOs;

public class CreateGameSessionDto
{
    public Guid PlayerCharacterId { get; set; }
    public string Season { get; set; } = string.Empty;
}