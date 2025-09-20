using System.ComponentModel.DataAnnotations;

namespace IdentityService.Api.Entities;

public class AuthorizationCode
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(128)]
    public string Code { get; set; } = string.Empty;

    [Required]
    public Guid UserId { get; set; }

    public User? User { get; set; }

    [Required]
    public Guid OAuthClientId { get; set; }

    public OAuthClient? Client { get; set; }

    [Required]
    [MaxLength(512)]
    public string RedirectUri { get; set; } = string.Empty;

    [MaxLength(256)]
    public string? Scopes { get; set; }

    public DateTime ExpiresAt { get; set; }

    public bool Consumed { get; set; }
}
