namespace Northward.Game.Application.DTOs;

public class PlayerCharacterDto
{
    public Guid Id { get; set; }
    public string CharacterType { get; set; } = string.Empty;
    public string CustomName { get; set; } = string.Empty;
    public bool IsUnlocked { get; set; }
    public DateTime CreatedAt { get; set; }
}