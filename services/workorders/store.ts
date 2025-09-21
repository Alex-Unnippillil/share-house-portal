import type {
  ScheduleListFilters,
  ScheduledAssignment,
  WorkOrder,
  WorkOrderState,
} from './types';

export class WorkOrderStore {
  private readonly workOrders = new Map<string, WorkOrder>();

  save(workOrder: WorkOrder): WorkOrder {
    this.workOrders.set(workOrder.id, workOrder);
    return workOrder;
  }

  get(workOrderId: string): WorkOrder | undefined {
    return this.workOrders.get(workOrderId);
  }

  update(workOrderId: string, updater: (workOrder: WorkOrder) => WorkOrder): WorkOrder {
    const existing = this.workOrders.get(workOrderId);

    if (!existing) {
      throw new Error(`Work order ${workOrderId} not found`);
    }

    const updated = updater(existing);
    this.workOrders.set(workOrderId, updated);
    return updated;
  }

  list(): WorkOrder[] {
    return Array.from(this.workOrders.values());
  }

  clear(): void {
    this.workOrders.clear();
  }

  listByState(states: WorkOrderState[]): WorkOrder[] {
    return this.list().filter(order => states.includes(order.state));
  }

  listScheduledAssignments(filters: ScheduleListFilters = {}): ScheduledAssignment[] {
    const { staffId, start, end, includeStates } = filters;
    const states = includeStates ?? ['scheduled', 'in_progress'] as const;

    return this.list()
      .filter(order =>
        order.schedule.start &&
        order.schedule.end &&
        states.includes(order.schedule.state) &&
        (!staffId || order.assignment.technicianId === staffId) &&
        (!start || order.schedule.end.getTime() >= start.getTime()) &&
        (!end || order.schedule.start.getTime() <= end.getTime()),
      )
      .map(order => ({
        workOrderId: order.id,
        technicianId: order.assignment.technicianId,
        title: order.title,
        description: order.description,
        start: order.schedule.start!,
        end: order.schedule.end!,
        location: order.schedule.location,
        scheduleState: order.schedule.state,
      }));
  }
}

export const defaultWorkOrderStore = new WorkOrderStore();
