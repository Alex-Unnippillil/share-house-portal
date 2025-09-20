namespace ShareHousePortal.Domain.Entities;

public class WorkOrderAssignment
{
    public Guid Id { get; set; }
    public Guid WorkOrderId { get; set; }
    public string AssigneeId { get; set; } = string.Empty;
    public string AssigneeName { get; set; } = string.Empty;
    public string? Role { get; set; }
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AcknowledgedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? Notes { get; set; }

    public WorkOrder WorkOrder { get; set; } = null!;
}
