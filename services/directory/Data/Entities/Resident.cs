using System;

namespace DirectoryService.Data.Entities;

public class Resident
{
    public Guid Id { get; set; }
    public Guid BuildingId { get; set; }
    public Guid AccountId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public bool IsPrimary { get; set; }
    public DateTime MoveInDate { get; set; }
    public DateTime? MoveOutDate { get; set; }

    public Building? Building { get; set; }
    public Account? Account { get; set; }
}
