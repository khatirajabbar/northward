using System.ComponentModel.DataAnnotations;

namespace Northward.WebApp.Models;

public class RegisterViewModel
{
    [Required(ErrorMessage = "username is required")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "username must be 3-50 characters")]
    [Display(Name = "username")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "email is required")]
    [EmailAddress(ErrorMessage = "please enter a valid email")]
    [Display(Name = "email")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "password is required")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "password must be at least 8 characters")]
    [DataType(DataType.Password)]
    [Display(Name = "password")]
    public string Password { get; set; } = string.Empty;
}
