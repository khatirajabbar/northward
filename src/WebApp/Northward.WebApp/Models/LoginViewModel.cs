using System.ComponentModel.DataAnnotations;

namespace Northward.WebApp.Models;

public class LoginViewModel
{
    [Required(ErrorMessage = "email is required")]
    [EmailAddress(ErrorMessage = "please enter a valid email")]
    [Display(Name = "email")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "password is required")]
    [DataType(DataType.Password)]
    [Display(Name = "password")]
    public string Password { get; set; } = string.Empty;
}
