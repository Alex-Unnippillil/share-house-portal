using System.ComponentModel.DataAnnotations;

namespace IdentityService.Api.Entities;

public class ScimGroup
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(128)]
    public string DisplayName { get; set; } = string.Empty;

    public ICollection<ScimGroupMember> Members { get; set; } = new List<ScimGroupMember>();
}
