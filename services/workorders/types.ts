export type WorkOrderState =
  | 'draft'
  | 'submitted'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type TechnicianAssignmentState =
  | 'unassigned'
  | 'assigned'
  | 'dispatched'
  | 'on_site'
  | 'completed';

export type ScheduleState =
  | 'unscheduled'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'missed'
  | 'cancelled';

export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'emergency';

export interface SlaTimer {
  policy: SlaPolicy;
  isActive: boolean;
  isBreached: boolean;
  startedAt: Date | null;
  deadline: Date | null;
  timeRemainingMs: number | null;
}

export interface SlaPolicy {
  priority: WorkOrderPriority;
  responseWithinHours: number;
}

export interface TechnicianAssignment {
  technicianId: string | null;
  state: TechnicianAssignmentState;
  dispatchedAt: Date | null;
  arrivedAt: Date | null;
  completedAt: Date | null;
}

export interface WorkOrderSchedule {
  state: ScheduleState;
  start: Date | null;
  end: Date | null;
  location?: string;
  notes?: string;
}

export interface WorkOrder {
  id: string;
  title: string;
  description?: string;
  priority: WorkOrderPriority;
  state: WorkOrderState;
  createdAt: Date;
  submittedAt: Date | null;
  closedAt: Date | null;
  assignment: TechnicianAssignment;
  schedule: WorkOrderSchedule;
  sla: SlaTimer;
}

export interface CreateWorkOrderInput {
  id?: string;
  title: string;
  description?: string;
  priority?: WorkOrderPriority;
}

export interface ScheduleInput {
  start: Date;
  end: Date;
  location?: string;
  notes?: string;
}

export interface ScheduledAssignment {
  workOrderId: string;
  technicianId: string | null;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  scheduleState: ScheduleState;
}

export interface ScheduleListFilters {
  staffId?: string;
  start?: Date;
  end?: Date;
  includeStates?: ScheduleState[];
}
