namespace Northward.Auth.Application.DTOs;

public record UserProfileResponseDto(
    Guid UserId,
    string Username,
    string Email,
    DateTime CreatedAt,
    DateTime? LastLoginAt
);
