using System.ComponentModel.DataAnnotations;

namespace Northward.Auth.Application.DTOs;

public record RefreshTokenRequestDto(
    [Required(ErrorMessage = "Refresh token is required.")]
    string RefreshToken
);
