namespace Northward.Game.Domain.Entities;

public class GameSession
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public Guid PlayerCharacterId { get; private set; }
    public string Season { get; private set; } = string.Empty;
    public int Score { get; private set; }
    public bool IsCompleted { get; private set; }
    public DateTime StartedAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }

    private GameSession() { }

    public static GameSession Create(Guid userId, Guid playerCharacterId, string season)
    {
        return new GameSession
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            PlayerCharacterId = playerCharacterId,
            Season = season,
            Score = 0,
            IsCompleted = false,
            StartedAt = DateTime.UtcNow
        };
    }

    public void AddScore(int points)
    {
        Score += points;
    }

    public void Complete()
    {
        IsCompleted = true;
        CompletedAt = DateTime.UtcNow;
    }
}