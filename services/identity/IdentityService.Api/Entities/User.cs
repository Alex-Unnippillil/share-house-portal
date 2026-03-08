using System.ComponentModel.DataAnnotations;

namespace IdentityService.Api.Entities;

public class User
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(128)]
    public string? DisplayName { get; set; }

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    public bool Active { get; set; } = true;

    public bool MfaEnabled { get; set; }

    [MaxLength(512)]
    public string? MfaSecret { get; set; }

    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

    public ICollection<PasswordResetToken> PasswordResetTokens { get; set; } = new List<PasswordResetToken>();

    public ICollection<AuthorizationCode> AuthorizationCodes { get; set; } = new List<AuthorizationCode>();

    public ICollection<ScimGroupMember> GroupMemberships { get; set; } = new List<ScimGroupMember>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
