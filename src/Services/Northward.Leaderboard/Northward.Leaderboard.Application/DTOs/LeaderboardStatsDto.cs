namespace Northward.Leaderboard.Application.DTOs;

// the board in a few numbers, for the website's status panel
public record LeaderboardStatsDto(
    int Travelers,          // different people who reached the end of the road
    int Journeys,           // finished journeys in all
    int? Kindest,           // the most kindness anyone finished with
    TimeSpan? Quickest      // the shortest journey
);
