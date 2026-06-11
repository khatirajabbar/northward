namespace Northward.Auth.Application.DTOs;

public record AuthResponse(
    string Token,
    string TokenType,
    DateTime ExpiresAt,
    Guid UserId,
    string Username
);