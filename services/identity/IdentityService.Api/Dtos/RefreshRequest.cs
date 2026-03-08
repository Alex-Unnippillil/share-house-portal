using System.ComponentModel.DataAnnotations;

namespace IdentityService.Api.Dtos;

public class RefreshRequest
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}
