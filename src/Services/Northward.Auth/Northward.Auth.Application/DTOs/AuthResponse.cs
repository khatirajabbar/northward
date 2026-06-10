namespace Northward.Auth.Application.DTOs;

public record AuthResponse(string Token, string Username, Guid UserId);
