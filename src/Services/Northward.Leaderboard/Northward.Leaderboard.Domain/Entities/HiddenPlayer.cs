namespace Northward.Leaderboard.Domain.Entities;

// A player the admin has taken off the public board (a name nobody should
// have to read). Their journeys are kept, and their account is untouched:
// they just don't show on the board, or in its numbers, until they're shown again.
public class HiddenPlayer
{
    public Guid UserId { get; private set; }
    public DateTime HiddenAt { get; private set; }

    private HiddenPlayer() { }

    public static HiddenPlayer Create(Guid userId) => new() { UserId = userId, HiddenAt = DateTime.UtcNow };
}
