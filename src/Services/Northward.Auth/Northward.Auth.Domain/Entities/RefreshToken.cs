using Northward.Auth.Domain.Exceptions;

namespace Northward.Auth.Domain.Entities;

public class RefreshToken
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public string Token { get; private set; } = string.Empty;
    public DateTime ExpiresAt { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? RevokedAt { get; private set; }
    public string? ReplacedByToken { get; private set; }

    public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
    public bool IsRevoked => RevokedAt is not null;
    public bool IsActive => !IsExpired && !IsRevoked;

    private RefreshToken() { }

    public static RefreshToken Create(Guid userId, string token, DateTime expiresAt)
    {
        if (userId == Guid.Empty)
            throw new DomainException("User ID is required.");

        if (string.IsNullOrWhiteSpace(token))
            throw new DomainException("Refresh token value cannot be empty.");

        if (expiresAt <= DateTime.UtcNow)
            throw new DomainException("Refresh token expiry must be in the future.");

        return new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Token = token,
            ExpiresAt = expiresAt,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Revoke(string? replacedByToken = null)
    {
        if (IsRevoked)
            throw new DomainException("Refresh token is already revoked.");

        RevokedAt = DateTime.UtcNow;
        ReplacedByToken = replacedByToken;
    }
}