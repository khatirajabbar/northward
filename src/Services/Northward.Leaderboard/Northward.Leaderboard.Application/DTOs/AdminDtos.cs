namespace Northward.Leaderboard.Application.DTOs;

// a player on the admin page: their name, how they did, and whether the board shows them
public record BoardPlayerDto(
    Guid UserId,
    string Username,
    int Journeys,
    int Kindest,
    TimeSpan Quickest,
    DateTime LastArrived,
    bool Hidden
);

// the admin taking a player off the board, or putting them back
public record SetHiddenRequestDto(bool Hidden);
