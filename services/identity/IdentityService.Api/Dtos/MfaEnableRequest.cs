using System.ComponentModel.DataAnnotations;

namespace IdentityService.Api.Dtos;

public class MfaEnableRequest
{
    [Required]
    public string Code { get; set; } = string.Empty;

    public string? SharedKey { get; set; }
}
