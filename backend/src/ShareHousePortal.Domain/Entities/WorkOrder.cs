using ShareHousePortal.Domain.Enums;

namespace ShareHousePortal.Domain.Entities;

public class WorkOrder
{
    public Guid Id { get; set; }
    public Guid ServiceRequestId { get; set; }
    public Guid BuildingId { get; set; }
    public string WorkOrderNumber { get; set; } = string.Empty;
    public WorkOrderStatus Status { get; set; } = WorkOrderStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ScheduledFor { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? Summary { get; set; }
    public string? Notes { get; set; }

    public ServiceRequest ServiceRequest { get; set; } = null!;
    public Building Building { get; set; } = null!;
    public ICollection<WorkOrderAssignment> Assignments { get; set; } = new List<WorkOrderAssignment>();
}
