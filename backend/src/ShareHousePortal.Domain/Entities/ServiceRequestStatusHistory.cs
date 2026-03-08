using ShareHousePortal.Domain.Enums;

namespace ShareHousePortal.Domain.Entities;

public class ServiceRequestStatusHistory
{
    public Guid Id { get; set; }
    public Guid ServiceRequestId { get; set; }
    public ServiceRequestStatus FromStatus { get; set; }
    public ServiceRequestStatus ToStatus { get; set; }
    public string ChangedBy { get; set; } = string.Empty;
    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
    public string? Comment { get; set; }

    public ServiceRequest ServiceRequest { get; set; } = null!;
}
