namespace Northward.Leaderboard.Domain.Repositories;

// one player as the admin page sees them: everyone who has reached the end,
// hidden or not
public record BoardPlayer(Guid UserId, string Username, int Journeys, int Kindest, TimeSpan Quickest, DateTime LastArrived, bool Hidden);
