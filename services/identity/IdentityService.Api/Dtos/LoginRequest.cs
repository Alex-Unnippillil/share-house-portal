using System.ComponentModel.DataAnnotations;

namespace IdentityService.Api.Dtos;

public class LoginRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;

    public string? MfaCode { get; set; }
}
