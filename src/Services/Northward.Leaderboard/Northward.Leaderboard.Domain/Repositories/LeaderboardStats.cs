namespace Northward.Leaderboard.Domain.Repositories;

public record LeaderboardStats(int Travelers, int Journeys, int? Kindest, TimeSpan? Quickest);
