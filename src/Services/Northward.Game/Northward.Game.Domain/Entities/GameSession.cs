namespace Northward.Game.Domain.Entities;

public class GameSession
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public Guid PlayerCharacterId { get; private set; }
    public string Season { get; private set; } = string.Empty;
    public string CurrentScene { get; private set; } = string.Empty;
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
            CurrentScene = Scenes.Morning,
            Score = 0,
            IsCompleted = false,
            StartedAt = DateTime.UtcNow
        };
    }

    public void AddScore(int points)
    {
        if (IsCompleted)
            throw new InvalidOperationException("cannot add score to a completed session");

        if (points <= 0)
            throw new ArgumentException("points must be positive", nameof(points));

        Score += points;
    }

    public void UpdateProgress(string currentScene, int score)
    {
        if (IsCompleted)
            throw new InvalidOperationException("cannot update progress on a completed session");

        if (string.IsNullOrWhiteSpace(currentScene))
            throw new ArgumentException("current scene is required", nameof(currentScene));

        if (score < 0)
            throw new ArgumentException("score cannot be negative", nameof(score));

        CurrentScene = currentScene;
        Score = score;
    }

    public void Complete()
    {
        if (IsCompleted)
            throw new InvalidOperationException("session is already completed");

        IsCompleted = true;
        CompletedAt = DateTime.UtcNow;
    }
}
