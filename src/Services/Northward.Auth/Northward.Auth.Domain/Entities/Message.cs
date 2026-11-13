using Northward.Auth.Domain.Exceptions;

namespace Northward.Auth.Domain.Entities;

// Something a player wrote to the people who made the game, from the
// website's "say something" page. Read on the admin page; it goes when its
// writer's account is deleted.
public class Message
{
    public const int MaxLength = 2000;

    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public string Text { get; private set; } = string.Empty;
    public DateTime CreatedAt { get; private set; }

    private Message() { }

    public static Message Create(Guid userId, string text)
    {
        if (userId == Guid.Empty)
            throw new DomainException("User ID is required.");

        var trimmed = (text ?? string.Empty).Trim();

        if (trimmed.Length == 0)
            throw new DomainException("The message is empty.");

        if (trimmed.Length > MaxLength)
            throw new DomainException($"The message is too long ({MaxLength} characters at most).");

        return new Message
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Text = trimmed,
            CreatedAt = DateTime.UtcNow
        };
    }
}
