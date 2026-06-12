namespace Northward.Game.Application.DTOs;

public class GameSessionDto
{
    public Guid Id { get; set; }
    public Guid PlayerCharacterId { get; set; }
    public string Season { get; set; } = string.Empty;
    public int Score { get; set; }
    public bool IsCompleted { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}