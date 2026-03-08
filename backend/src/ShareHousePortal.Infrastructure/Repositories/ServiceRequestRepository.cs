using Microsoft.EntityFrameworkCore;
using ShareHousePortal.Domain.Entities;
using ShareHousePortal.Domain.Enums;
using ShareHousePortal.Domain.Repositories;
using ShareHousePortal.Infrastructure.Data;

namespace ShareHousePortal.Infrastructure.Repositories;

public class ServiceRequestRepository : IServiceRequestRepository
{
    private readonly ShareHousePortalDbContext _dbContext;

    public ServiceRequestRepository(ShareHousePortalDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ServiceRequest?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.ServiceRequests
            .Include(sr => sr.Building)
            .Include(sr => sr.WorkOrders)
                .ThenInclude(wo => wo.Assignments)
            .Include(sr => sr.StatusHistory)
            .Include(sr => sr.SlaTarget)
            .FirstOrDefaultAsync(sr => sr.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<ServiceRequest>> GetByBuildingAsync(Guid buildingId, ServiceRequestStatus? status = null, CancellationToken cancellationToken = default)
    {
        IQueryable<ServiceRequest> query = _dbContext.ServiceRequests
            .Include(sr => sr.SlaTarget)
            .Include(sr => sr.WorkOrders)
            .Include(sr => sr.StatusHistory)
            .Where(sr => sr.BuildingId == buildingId)
            .OrderByDescending(sr => sr.RequestedAt);

        if (status.HasValue)
        {
            query = query.Where(sr => sr.Status == status);
        }

        return await query.ToListAsync(cancellationToken);
    }

    public async Task AddAsync(ServiceRequest request, CancellationToken cancellationToken = default)
    {
        _dbContext.ServiceRequests.Add(request);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(ServiceRequest request, CancellationToken cancellationToken = default)
    {
        _dbContext.ServiceRequests.Update(request);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddWorkOrderAsync(Guid requestId, WorkOrder workOrder, CancellationToken cancellationToken = default)
    {
        var serviceRequest = await _dbContext.ServiceRequests
            .Include(sr => sr.WorkOrders)
            .FirstOrDefaultAsync(sr => sr.Id == requestId, cancellationToken);

        if (serviceRequest is null)
        {
            throw new InvalidOperationException($"Service request {requestId} was not found.");
        }

        serviceRequest.WorkOrders.Add(workOrder);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddStatusHistoryAsync(ServiceRequestStatusHistory statusHistory, CancellationToken cancellationToken = default)
    {
        _dbContext.ServiceRequestStatusHistory.Add(statusHistory);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddWorkOrderAssignmentAsync(Guid workOrderId, WorkOrderAssignment assignment, CancellationToken cancellationToken = default)
    {
        var workOrder = await _dbContext.WorkOrders
            .Include(wo => wo.Assignments)
            .FirstOrDefaultAsync(wo => wo.Id == workOrderId, cancellationToken);

        if (workOrder is null)
        {
            throw new InvalidOperationException($"Work order {workOrderId} was not found.");
        }

        workOrder.Assignments.Add(assignment);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpsertSlaTargetAsync(ServiceLevelAgreementTarget slaTarget, CancellationToken cancellationToken = default)
    {
        var existing = await _dbContext.ServiceLevelAgreementTargets
            .FirstOrDefaultAsync(st => st.ServiceRequestId == slaTarget.ServiceRequestId, cancellationToken);

        if (existing is null)
        {
            _dbContext.ServiceLevelAgreementTargets.Add(slaTarget);
        }
        else
        {
            existing.ResponseHours = slaTarget.ResponseHours;
            existing.ResolutionHours = slaTarget.ResolutionHours;
            existing.EffectiveUntil = slaTarget.EffectiveUntil;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
