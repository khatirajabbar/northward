using System.ComponentModel.DataAnnotations;

namespace Northward.Auth.Application.DTOs;

public record LoginRequest(
    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Please provide a valid email address.")]
    string Email,

    [Required(ErrorMessage = "Password is required.")]
    string Password
);