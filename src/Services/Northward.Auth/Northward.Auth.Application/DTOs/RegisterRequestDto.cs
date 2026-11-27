using System.ComponentModel.DataAnnotations;

namespace Northward.Auth.Application.DTOs;

public record RegisterRequestDto(
    [Required(ErrorMessage = "Username is required.")]
    // the rules a name must keep (3 to 20 characters, which letters …) are
    // UsernameRules', so a player is told exactly what's wrong; this only stops
    // something absurdly long from being sent at all
    [MaxLength(100, ErrorMessage = "your name can be 20 characters at most.")]
    string Username,

    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Please provide a valid email address.")]
    string Email,

    [Required(ErrorMessage = "Password is required.")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Password must be at least 8 characters.")]
    string Password
);
