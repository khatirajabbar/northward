using System.Security.Cryptography;
using System.Text;
using Northward.Auth.Domain.Exceptions;

namespace Northward.Auth.Domain.Entities;

// A sign-in renewal code. Only its fingerprint is kept (Token holds the
// fingerprint, not the code), so a copy of the database can't be used to sign
// in as anyone: the code itself exists only in the player's browser.
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
            Token = FingerprintOf(token),
            ExpiresAt = expiresAt,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Revoke(string? replacedByToken = null)
    {
        if (IsRevoked)
            throw new DomainException("Refresh token is already revoked.");

        RevokedAt = DateTime.UtcNow;
        ReplacedByToken = replacedByToken is null ? null : FingerprintOf(replacedByToken);
    }

    // the code is long and random, so a plain SHA-256 of it is enough to keep
    // (unlike a password, there's nothing to guess)
    public static string FingerprintOf(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}