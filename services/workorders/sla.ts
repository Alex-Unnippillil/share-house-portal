import { addHours } from 'date-fns';
import type { SlaPolicy, SlaTimer, WorkOrderPriority } from './types';

export const DEFAULT_SLA_POLICIES: Record<WorkOrderPriority, SlaPolicy> = {
  low: { priority: 'low', responseWithinHours: 72 },
  medium: { priority: 'medium', responseWithinHours: 24 },
  high: { priority: 'high', responseWithinHours: 8 },
  emergency: { priority: 'emergency', responseWithinHours: 2 },
};

export function createSlaTimer(priority: WorkOrderPriority): SlaTimer {
  const policy = DEFAULT_SLA_POLICIES[priority];

  return {
    policy,
    isActive: false,
    isBreached: false,
    startedAt: null,
    deadline: null,
    timeRemainingMs: null,
  };
}

export function startSlaTimer(timer: SlaTimer, startDate: Date): SlaTimer {
  const deadline = addHours(startDate, timer.policy.responseWithinHours);

  return {
    ...timer,
    isActive: true,
    startedAt: startDate,
    deadline,
    isBreached: startDate > deadline,
    timeRemainingMs: Math.max(deadline.getTime() - startDate.getTime(), 0),
  };
}

export function refreshSlaTimer(timer: SlaTimer, now: Date): SlaTimer {
  if (!timer.isActive || !timer.deadline || !timer.startedAt) {
    return timer;
  }

  const remaining = timer.deadline.getTime() - now.getTime();

  return {
    ...timer,
    isBreached: remaining < 0,
    timeRemainingMs: Math.max(remaining, 0),
  };
}

export function completeSlaTimer(timer: SlaTimer, completedAt: Date): SlaTimer {
  if (!timer.startedAt) {
    return timer;
  }

  return {
    ...timer,
    isActive: false,
    isBreached:
      completedAt.getTime() > (timer.deadline?.getTime() ?? completedAt.getTime()),
    timeRemainingMs: 0,
  };
}
