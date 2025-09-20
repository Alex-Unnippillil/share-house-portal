using System;

namespace DirectoryService.Data.Entities;

public class AuditLog
{
    public Guid Id { get; set; }
    public Guid BuildingId { get; set; }
    public string EntityName { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Changes { get; set; } = string.Empty;
    public string PerformedBy { get; set; } = string.Empty;
    public DateTime PerformedAtUtc { get; set; }
    public string? CorrelationId { get; set; }

    public Building? Building { get; set; }
}
