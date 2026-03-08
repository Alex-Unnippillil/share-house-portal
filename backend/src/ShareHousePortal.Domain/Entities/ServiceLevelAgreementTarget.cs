namespace ShareHousePortal.Domain.Entities;

public class ServiceLevelAgreementTarget
{
    public Guid Id { get; set; }
    public Guid ServiceRequestId { get; set; }
    public int ResponseHours { get; set; }
    public int ResolutionHours { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? EffectiveUntil { get; set; }

    public ServiceRequest ServiceRequest { get; set; } = null!;
}
