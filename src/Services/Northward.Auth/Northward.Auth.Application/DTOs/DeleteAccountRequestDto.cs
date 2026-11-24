using System.ComponentModel.DataAnnotations;

namespace Northward.Auth.Application.DTOs;

// Deleting an account can't be undone, so it asks for the password again:
// being signed in on a shared computer isn't enough.
public record DeleteAccountRequestDto(
    [Required(ErrorMessage = "Password is required.")]
    string Password
);
