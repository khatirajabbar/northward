using System.ComponentModel.DataAnnotations;

namespace Northward.Auth.Application.DTOs;

public record RefreshTokenRequest(
    [Required(ErrorMessage = "Refresh token is required.")]
    string RefreshToken
);