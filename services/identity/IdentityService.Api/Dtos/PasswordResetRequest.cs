using System.ComponentModel.DataAnnotations;

namespace IdentityService.Api.Dtos;

public class PasswordResetRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}
