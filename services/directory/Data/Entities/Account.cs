using System;
using System.Collections.Generic;

namespace DirectoryService.Data.Entities;

public class Account
{
    public Guid Id { get; set; }
    public Guid BuildingId { get; set; }
    public Guid UnitId { get; set; }
    public string AccountNumber { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public decimal Balance { get; set; }

    public Building? Building { get; set; }
    public Unit? Unit { get; set; }
    public ICollection<Resident> Residents { get; set; } = new List<Resident>();
}
