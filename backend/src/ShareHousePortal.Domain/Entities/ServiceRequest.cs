using ShareHousePortal.Domain.Enums;

namespace ShareHousePortal.Domain.Entities;

public class ServiceRequest
{
    public Guid Id { get; set; }
    public Guid BuildingId { get; set; }
    public string ReferenceNumber { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ServiceRequestStatus Status { get; set; } = ServiceRequestStatus.Draft;
    public ServiceRequestPriority Priority { get; set; } = ServiceRequestPriority.Medium;
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DueBy { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string RequestedBy { get; set; } = string.Empty;
    public string? RequestedByEmail { get; set; }
    public string? Notes { get; set; }

    public Building Building { get; set; } = null!;
    public ICollection<WorkOrder> WorkOrders { get; set; } = new List<WorkOrder>();
    public ICollection<ServiceRequestStatusHistory> StatusHistory { get; set; } = new List<ServiceRequestStatusHistory>();
    public ServiceLevelAgreementTarget? SlaTarget { get; set; }
}
