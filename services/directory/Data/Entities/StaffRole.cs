using System;

namespace DirectoryService.Data.Entities;

public class StaffRole
{
    public Guid StaffId { get; set; }
    public Guid RoleId { get; set; }
    public Guid BuildingId { get; set; }

    public Staff? Staff { get; set; }
    public Role? Role { get; set; }
    public Building? Building { get; set; }
}
