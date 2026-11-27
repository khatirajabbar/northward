namespace Northward.Auth.Domain.Entities;

using Northward.Auth.Domain.Exceptions;

public class User
{
    public Guid Id { get; private set; }
    public string Username { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public DateTime CreatedAt { get; private set; }
    public DateTime? LastLoginAt { get; private set; }

    // wrong passwords in a row; after too many, the account can't be signed in
    // to for a while, so a password can't be guessed by trying thousands
    public int FailedLogins { get; private set; }
    public DateTime? LockedUntil { get; private set; }

    public const int MostFailedLogins = 10;
    public static readonly TimeSpan LockedFor = TimeSpan.FromMinutes(15);

    private User() { }

    public static User Create(string username, string email, string passwordHash)
    {
        // the name everyone sees on the leaderboard: see UsernameRules
        var problem = UsernameRules.Problem(username);
        if (problem is not null)
            throw new DomainException(problem);

        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
            throw new DomainException("A valid email is required.");

        if (string.IsNullOrWhiteSpace(passwordHash))
            throw new DomainException("Password hash cannot be empty.");

        return new User
        {
            Id = Guid.NewGuid(),
            Username = UsernameRules.Clean(username),
            Email = email.Trim().ToLowerInvariant(),
            PasswordHash = passwordHash,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void UpdatePassword(string newPasswordHash)
    {
        if (string.IsNullOrWhiteSpace(newPasswordHash))
            throw new DomainException("Password hash cannot be empty.");

        PasswordHash = newPasswordHash;
    }

    public void RecordLogin()
    {
        LastLoginAt = DateTime.UtcNow;
        FailedLogins = 0;
        LockedUntil = null;
    }

    public bool IsLocked(DateTime now) => LockedUntil > now;

    public void RecordFailedLogin(DateTime now)
    {
        FailedLogins++;
        if (FailedLogins >= MostFailedLogins)
        {
            LockedUntil = now.Add(LockedFor);
            FailedLogins = 0;
        }
    }
}