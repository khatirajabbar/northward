namespace Northward.Game.Domain.Entities;

public class GameSession
{
    // a player keeps at most this many journeys on the go — their save slots.
    // (a finished journey isn't kept: its kindness is on the leaderboard)
    public const int MaxOpenPerUser = 4;

    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public Guid PlayerCharacterId { get; private set; }
    public string Season { get; private set; } = string.Empty;
    public string CurrentScene { get; private set; } = string.Empty;
    public string? Checkpoint { get; private set; }
    public int Score { get; private set; }
    public bool IsCompleted { get; private set; }
    public DateTime StartedAt { get; private set; }
    public DateTime LastPlayedAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }

    private GameSession() { }

    public static GameSession Create(Guid userId, Guid playerCharacterId, string season)
    {
        var now = DateTime.UtcNow;
        return new GameSession
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            PlayerCharacterId = playerCharacterId,
            Season = season,
            CurrentScene = Scenes.Morning,
            Score = 0,
            IsCompleted = false,
            StartedAt = now,
            LastPlayedAt = now
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

    public void UpdateProgress(string currentScene, int score, string? checkpoint)
    {
        if (IsCompleted)
            throw new InvalidOperationException("cannot update progress on a completed session");

        if (string.IsNullOrWhiteSpace(currentScene))
            throw new ArgumentException("current scene is required", nameof(currentScene));

        if (score < 0)
            throw new ArgumentException("score cannot be negative", nameof(score));

        CurrentScene = currentScene;
        Score = score;
        Checkpoint = checkpoint;
        LastPlayedAt = DateTime.UtcNow;
    }

    public void Complete()
    {
        if (IsCompleted)
            throw new InvalidOperationException("session is already completed");

        IsCompleted = true;
        CompletedAt = DateTime.UtcNow;
    }
}
