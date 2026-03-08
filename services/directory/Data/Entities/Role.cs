using System;
using System.Collections.Generic;

namespace DirectoryService.Data.Entities;

public class Role
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
    public ICollection<StaffRole> StaffRoles { get; set; } = new List<StaffRole>();
}
