using System;
using System.Collections.Generic;

namespace DirectoryService.Data.Entities;

public class Unit
{
    public Guid Id { get; set; }
    public Guid BuildingId { get; set; }
    public string Identifier { get; set; } = string.Empty;
    public int? FloorNumber { get; set; }
    public int Bedrooms { get; set; }
    public int Bathrooms { get; set; }
    public int SquareFeet { get; set; }
    public bool IsActive { get; set; } = true;

    public Building? Building { get; set; }
    public ICollection<Account> Accounts { get; set; } = new List<Account>();
}
