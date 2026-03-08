using System;
using System.Collections.Generic;

namespace DirectoryService.Data.Entities;

public class Staff
{
    public Guid Id { get; set; }
    public Guid BuildingId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public DateTime HireDate { get; set; }
    public DateTime? TerminationDate { get; set; }

    public Building? Building { get; set; }
    public ICollection<StaffRole> StaffRoles { get; set; } = new List<StaffRole>();
}
