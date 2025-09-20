using System.ComponentModel.DataAnnotations;

namespace IdentityService.Api.Entities;

public class ScimGroupMember
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid GroupId { get; set; }

    public ScimGroup? Group { get; set; }

    [Required]
    public Guid UserId { get; set; }

    public User? User { get; set; }
}
