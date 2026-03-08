using System.ComponentModel.DataAnnotations;

namespace IdentityService.Api.Dtos;

public class PasswordResetConfirmRequest
{
    [Required]
    public string Token { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    public string NewPassword { get; set; } = string.Empty;
}
