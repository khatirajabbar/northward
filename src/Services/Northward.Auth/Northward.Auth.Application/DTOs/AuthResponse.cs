namespace Northward.Auth.Application.DTOs;

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    string TokenType,
    DateTime AccessTokenExpiresAt,
    DateTime RefreshTokenExpiresAt,
    Guid UserId,
    string Username
);