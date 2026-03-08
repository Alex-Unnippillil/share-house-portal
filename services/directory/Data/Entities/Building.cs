using System;
using System.Collections.Generic;

namespace DirectoryService.Data.Entities;

public class Building
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? PostalCode { get; set; }
    public DateTime CreatedAtUtc { get; set; }

    public ICollection<Unit> Units { get; set; } = new List<Unit>();
    public ICollection<Account> Accounts { get; set; } = new List<Account>();
    public ICollection<Resident> Residents { get; set; } = new List<Resident>();
    public ICollection<Staff> StaffMembers { get; set; } = new List<Staff>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}
