namespace Northward.Game.Application.DTOs;

public class CreatePlayerCharacterDto
{
    public string CharacterType { get; set; } = string.Empty;
    public string CustomName { get; set; } = string.Empty;
}