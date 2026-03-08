using System.ComponentModel.DataAnnotations;

namespace IdentityService.Api.Entities;

public class PasswordResetToken
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(256)]
    public string Token { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    public bool Used { get; set; }

    public Guid UserId { get; set; }

    public User? User { get; set; }
}
