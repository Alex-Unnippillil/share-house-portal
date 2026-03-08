using System.ComponentModel.DataAnnotations;

namespace IdentityService.Api.Dtos;

public class RegisterRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    public string Password { get; set; } = string.Empty;

    [MaxLength(128)]
    public string? DisplayName { get; set; }
}
