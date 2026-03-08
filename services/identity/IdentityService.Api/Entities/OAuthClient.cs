using System.ComponentModel.DataAnnotations;

namespace IdentityService.Api.Entities;

public class OAuthClient
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(128)]
    public string ClientId { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    public string ClientSecret { get; set; } = string.Empty;

    [Required]
    [MaxLength(512)]
    public string RedirectUri { get; set; } = string.Empty;

    [MaxLength(128)]
    public string Name { get; set; } = string.Empty;

    public ICollection<AuthorizationCode> AuthorizationCodes { get; set; } = new List<AuthorizationCode>();
}
