import { randomUUID } from 'crypto';
import {
  completeSlaTimer,
  createSlaTimer,
  refreshSlaTimer,
  startSlaTimer,
} from './sla';
import { WorkOrderStore } from './store';
import type {
  CreateWorkOrderInput,
  ScheduleInput,
  ScheduleState,
  TechnicianAssignmentState,
  WorkOrder,
  WorkOrderState,
} from './types';

const WORK_ORDER_TRANSITIONS: Record<WorkOrderState, ReadonlyArray<WorkOrderState>> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['assigned', 'cancelled'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const TECHNICIAN_TRANSITIONS: Record<
  TechnicianAssignmentState,
  ReadonlyArray<TechnicianAssignmentState>
> = {
  unassigned: ['assigned'],
  assigned: ['dispatched', 'completed'],
  dispatched: ['on_site', 'completed'],
  on_site: ['completed'],
  completed: [],
};

const SCHEDULE_TRANSITIONS: Record<ScheduleState, ReadonlyArray<ScheduleState>> = {
  unscheduled: ['scheduled', 'cancelled'],
  scheduled: ['scheduled', 'in_progress', 'cancelled'],
  in_progress: ['completed', 'missed'],
  completed: [],
  missed: ['scheduled', 'cancelled'],
  cancelled: ['scheduled'],
};

export class StateTransitionError extends Error {
  constructor(
    public readonly entity: string,
    public readonly id: string,
    public readonly from: string,
    public readonly to: string,
  ) {
    super(
      `${entity} ${id} cannot transition from "${from}" to "${to}"`,
    );
  }
}

export interface WorkOrderStateMachineOptions {
  clock?: () => Date;
}

export class WorkOrderStateMachine {
  private readonly clock: () => Date;

  constructor(
    private readonly store: WorkOrderStore,
    options: WorkOrderStateMachineOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
  }

  createWorkOrder(input: CreateWorkOrderInput): WorkOrder {
    const now = this.clock();
    const priority = input.priority ?? 'medium';
    const workOrder: WorkOrder = {
      id: input.id ?? randomUUID(),
      title: input.title,
      description: input.description,
      priority,
      state: 'draft',
      createdAt: now,
      submittedAt: null,
      closedAt: null,
      assignment: {
        technicianId: null,
        state: 'unassigned',
        dispatchedAt: null,
        arrivedAt: null,
        completedAt: null,
      },
      schedule: {
        state: 'unscheduled',
        start: null,
        end: null,
        location: undefined,
        notes: undefined,
      },
      sla: createSlaTimer(priority),
    };

    return this.store.save(workOrder);
  }

  getWorkOrder(workOrderId: string): WorkOrder | undefined {
    const existing = this.store.get(workOrderId);

    if (!existing) {
      return undefined;
    }

    const refreshed = this.refreshSla(existing);
    if (refreshed !== existing) {
      this.store.save(refreshed);
    }

    return refreshed;
  }

  submitWorkOrder(workOrderId: string): WorkOrder {
    return this.store.update(workOrderId, workOrder => {
      const transitioned = this.transitionWorkOrderState(
        workOrder,
        'submitted',
      );
      const submittedAt = this.clock();
      const sla = startSlaTimer(transitioned.sla, submittedAt);

      return {
        ...transitioned,
        submittedAt,
        sla,
      };
    });
  }

  assignTechnician(
    workOrderId: string,
    technicianId: string,
    schedule?: ScheduleInput,
  ): WorkOrder {
    return this.store.update(workOrderId, workOrder => {
      const ensureState =
        workOrder.state === 'submitted'
          ? this.transitionWorkOrderState(workOrder, 'assigned')
          : workOrder;

      const nextAssignment = this.transitionAssignmentState(
        ensureState.assignment,
        'assigned',
      );

      const assignment = {
        ...nextAssignment,
        technicianId,
      };

      const scheduleState = schedule
        ? this.applySchedule(ensureState.schedule, schedule)
        : ensureState.schedule;

      return this.refreshSla({
        ...ensureState,
        assignment,
        schedule: scheduleState,
      });
    });
  }

  dispatchTechnician(workOrderId: string): WorkOrder {
    return this.store.update(workOrderId, workOrder => {
      if (!workOrder.assignment.technicianId) {
        throw new Error(
          `Cannot dispatch without a technician assignment for ${workOrderId}`,
        );
      }

      const assignment = this.transitionAssignmentState(
        workOrder.assignment,
        'dispatched',
      );
      const dispatchedAt = this.clock();

      const schedule =
        workOrder.schedule.state === 'unscheduled'
          ? this.transitionScheduleState(workOrder.schedule, 'scheduled')
          : workOrder.schedule;

      return this.refreshSla({
        ...workOrder,
        assignment: {
          ...assignment,
          dispatchedAt,
        },
        schedule,
      });
    });
  }

  startWork(workOrderId: string): WorkOrder {
    return this.store.update(workOrderId, workOrder => {
      const ensureState =
        workOrder.state === 'assigned'
          ? this.transitionWorkOrderState(workOrder, 'in_progress')
          : workOrder;

      if (ensureState.state !== 'in_progress') {
        throw new Error(
          `Work order ${workOrderId} must be in progress to start work`,
        );
      }

      const assignment = this.transitionAssignmentState(
        ensureState.assignment,
        'on_site',
      );
      const now = this.clock();
      const schedule = this.transitionScheduleState(
        ensureState.schedule,
        'in_progress',
      );

      return this.refreshSla({
        ...ensureState,
        assignment: {
          ...assignment,
          arrivedAt: now,
        },
        schedule,
      });
    });
  }

  completeWorkOrder(workOrderId: string): WorkOrder {
    return this.store.update(workOrderId, workOrder => {
      if (workOrder.state !== 'in_progress') {
        throw new StateTransitionError(
          'WorkOrder',
          workOrderId,
          workOrder.state,
          'completed',
        );
      }

      const completed = this.transitionWorkOrderState(workOrder, 'completed');
      const assignment = this.transitionAssignmentState(
        completed.assignment,
        'completed',
      );
      const schedule = this.transitionScheduleState(
        completed.schedule,
        'completed',
      );
      const now = this.clock();

      return {
        ...completed,
        assignment: {
          ...assignment,
          completedAt: now,
        },
        schedule,
        sla: completeSlaTimer(completed.sla, now),
        closedAt: now,
      };
    });
  }

  cancelWorkOrder(workOrderId: string): WorkOrder {
    return this.store.update(workOrderId, workOrder => {
      if (workOrder.state === 'completed') {
        throw new StateTransitionError(
          'WorkOrder',
          workOrderId,
          workOrder.state,
          'cancelled',
        );
      }

      const cancelled = this.transitionWorkOrderState(workOrder, 'cancelled');
      const schedule =
        cancelled.schedule.state === 'unscheduled'
          ? cancelled.schedule
          : this.transitionScheduleState(cancelled.schedule, 'cancelled');

      return this.refreshSla({
        ...cancelled,
        assignment: {
          technicianId: null,
          state: 'unassigned',
          dispatchedAt: null,
          arrivedAt: null,
          completedAt: null,
        },
        schedule,
      });
    });
  }

  scheduleWorkOrder(
    workOrderId: string,
    schedule: ScheduleInput,
  ): WorkOrder {
    return this.store.update(workOrderId, workOrder => {
      const scheduleState = this.applySchedule(workOrder.schedule, schedule);

      return this.refreshSla({
        ...workOrder,
        schedule: scheduleState,
      });
    });
  }

  markMissed(workOrderId: string): WorkOrder {
    return this.store.update(workOrderId, workOrder => {
      const schedule = this.transitionScheduleState(
        workOrder.schedule,
        'missed',
      );

      return this.refreshSla({
        ...workOrder,
        schedule,
      });
    });
  }

  listWorkOrders(): WorkOrder[] {
    return this.store.list().map(order => this.refreshSla(order));
  }

  private applySchedule(
    schedule: WorkOrder['schedule'],
    input: ScheduleInput,
  ): WorkOrder['schedule'] {
    if (input.end.getTime() <= input.start.getTime()) {
      throw new Error('Schedule end must be after start time');
    }

    const targetState = schedule.state === 'in_progress' ? 'in_progress' : 'scheduled';
    const transitioned = this.transitionScheduleState(schedule, targetState);

    return {
      ...transitioned,
      start: input.start,
      end: input.end,
      location: input.location ?? transitioned.location,
      notes: input.notes ?? transitioned.notes,
    };
  }

  private transitionWorkOrderState(
    workOrder: WorkOrder,
    target: WorkOrderState,
  ): WorkOrder {
    if (workOrder.state === target) {
      return workOrder;
    }

    const allowed = WORK_ORDER_TRANSITIONS[workOrder.state] ?? [];
    if (!allowed.includes(target)) {
      throw new StateTransitionError(
        'WorkOrder',
        workOrder.id,
        workOrder.state,
        target,
      );
    }

    return {
      ...workOrder,
      state: target,
    };
  }

  private transitionAssignmentState(
    assignment: WorkOrder['assignment'],
    target: TechnicianAssignmentState,
  ): WorkOrder['assignment'] {
    if (assignment.state === target) {
      return assignment;
    }

    const allowed = TECHNICIAN_TRANSITIONS[assignment.state] ?? [];
    if (!allowed.includes(target)) {
      throw new StateTransitionError(
        'TechnicianAssignment',
        assignment.technicianId ?? 'unassigned',
        assignment.state,
        target,
      );
    }

    return {
      ...assignment,
      state: target,
    };
  }

  private transitionScheduleState(
    schedule: WorkOrder['schedule'],
    target: ScheduleState,
  ): WorkOrder['schedule'] {
    if (schedule.state === target) {
      return schedule;
    }

    const allowed = SCHEDULE_TRANSITIONS[schedule.state] ?? [];
    if (!allowed.includes(target)) {
      throw new StateTransitionError(
        'Schedule',
        'work-order',
        schedule.state,
        target,
      );
    }

    return {
      ...schedule,
      state: target,
    };
  }

  private refreshSla(workOrder: WorkOrder): WorkOrder {
    const updatedSla = refreshSlaTimer(workOrder.sla, this.clock());
    if (updatedSla === workOrder.sla) {
      return workOrder;
    }

    return {
      ...workOrder,
      sla: updatedSla,
    };
  }
}
