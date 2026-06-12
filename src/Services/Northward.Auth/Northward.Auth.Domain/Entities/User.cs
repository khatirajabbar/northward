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

    private User() { }

    public static User Create(string username, string email, string passwordHash)
    {
        if (string.IsNullOrWhiteSpace(username))
            throw new DomainException("Username cannot be empty.");

        if (username.Length < 3)
            throw new DomainException("Username must be at least 3 characters.");

        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
            throw new DomainException("A valid email is required.");

        if (string.IsNullOrWhiteSpace(passwordHash))
            throw new DomainException("Password hash cannot be empty.");

        return new User
        {
            Id = Guid.NewGuid(),
            Username = username.Trim(),
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
    }
}