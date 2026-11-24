namespace Northward.Leaderboard.Domain.Entities;

public class LeaderboardEntry
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public string Username { get; private set; } = string.Empty;
    public string CharacterType { get; private set; } = string.Empty;
    public string Season { get; private set; } = string.Empty;
    public int Score { get; private set; }
    public TimeSpan CompletionTime { get; private set; }
    public DateTime CompletedAt { get; private set; }

    private LeaderboardEntry() { }

    public static LeaderboardEntry Create(
        Guid userId,
        string username,
        string characterType,
        string season,
        int score,
        TimeSpan completionTime)
    {
        if (string.IsNullOrWhiteSpace(username))
            throw new ArgumentException("username is required", nameof(username));

        if (string.IsNullOrWhiteSpace(characterType))
            throw new ArgumentException("character type is required", nameof(characterType));

        if (string.IsNullOrWhiteSpace(season))
            throw new ArgumentException("season is required", nameof(season));

        if (score < 0)
            throw new ArgumentException("score cannot be negative", nameof(score));

        if (completionTime <= TimeSpan.Zero)
            throw new ArgumentException("completion time must be positive", nameof(completionTime));

        return new LeaderboardEntry
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Username = username.Trim(),
            CharacterType = characterType,
            Season = season,
            Score = score,
            CompletionTime = completionTime,
            CompletedAt = DateTime.UtcNow
        };
    }
}
