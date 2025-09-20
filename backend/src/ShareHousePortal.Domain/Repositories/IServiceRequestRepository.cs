using ShareHousePortal.Domain.Entities;
using ShareHousePortal.Domain.Enums;

namespace ShareHousePortal.Domain.Repositories;

public interface IServiceRequestRepository
{
    Task<ServiceRequest?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ServiceRequest>> GetByBuildingAsync(Guid buildingId, ServiceRequestStatus? status = null, CancellationToken cancellationToken = default);
    Task AddAsync(ServiceRequest request, CancellationToken cancellationToken = default);
    Task UpdateAsync(ServiceRequest request, CancellationToken cancellationToken = default);
    Task AddWorkOrderAsync(Guid requestId, WorkOrder workOrder, CancellationToken cancellationToken = default);
    Task AddStatusHistoryAsync(ServiceRequestStatusHistory statusHistory, CancellationToken cancellationToken = default);
    Task AddWorkOrderAssignmentAsync(Guid workOrderId, WorkOrderAssignment assignment, CancellationToken cancellationToken = default);
    Task UpsertSlaTargetAsync(ServiceLevelAgreementTarget slaTarget, CancellationToken cancellationToken = default);
}
