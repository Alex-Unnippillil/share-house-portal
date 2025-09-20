import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  WorkOrderStateMachine,
  WorkOrderStore,
  StateTransitionError,
  generateICSFeed,
  defaultWorkOrderStore,
} from '@/services/workorders';
import { GET } from '@/app/api/staff/schedule/route';

const BASE_DATE = new Date('2024-01-01T09:00:00Z');

describe('WorkOrderStateMachine', () => {
  let currentDate: Date;
  let store: WorkOrderStore;
  let machine: WorkOrderStateMachine;

  const clock = () => new Date(currentDate);
  const advanceHours = (hours: number) => {
    currentDate = new Date(currentDate.getTime() + hours * 60 * 60 * 1000);
  };

  beforeEach(() => {
    currentDate = new Date(BASE_DATE);
    store = new WorkOrderStore();
    machine = new WorkOrderStateMachine(store, { clock });
  });

  it('creates a work order with default workflow state', () => {
    const workOrder = machine.createWorkOrder({ title: 'Repair faucet' });

    expect(workOrder.state).toBe('draft');
    expect(workOrder.assignment.state).toBe('unassigned');
    expect(workOrder.schedule.state).toBe('unscheduled');
    expect(workOrder.sla.isActive).toBe(false);
    expect(workOrder.sla.policy.responseWithinHours).toBeGreaterThan(0);
  });

  it('submits and assigns a work order while kicking off SLA tracking', () => {
    const created = machine.createWorkOrder({ title: 'Repair HVAC', priority: 'high' });
    const submitted = machine.submitWorkOrder(created.id);

    expect(submitted.state).toBe('submitted');
    expect(submitted.sla.isActive).toBe(true);
    expect(submitted.sla.deadline?.getTime()).toBe(
      BASE_DATE.getTime() + 8 * 60 * 60 * 1000,
    );

    const scheduleStart = new Date('2024-01-01T10:00:00Z');
    const scheduleEnd = new Date('2024-01-01T12:00:00Z');
    const assigned = machine.assignTechnician(submitted.id, 'tech-1', {
      start: scheduleStart,
      end: scheduleEnd,
      location: 'Unit 12',
    });

    expect(assigned.state).toBe('assigned');
    expect(assigned.assignment.state).toBe('assigned');
    expect(assigned.assignment.technicianId).toBe('tech-1');
    expect(assigned.schedule.start?.toISOString()).toBe(scheduleStart.toISOString());
    expect(assigned.schedule.state).toBe('scheduled');
  });

  it('drives a work order from dispatch through completion', () => {
    const created = machine.createWorkOrder({ title: 'Inspect roof' });
    const submitted = machine.submitWorkOrder(created.id);
    machine.assignTechnician(submitted.id, 'tech-9', {
      start: new Date('2024-01-01T11:00:00Z'),
      end: new Date('2024-01-01T13:00:00Z'),
      location: 'Warehouse',
    });
    const dispatched = machine.dispatchTechnician(submitted.id);
    expect(dispatched.assignment.state).toBe('dispatched');

    const inProgress = machine.startWork(submitted.id);
    expect(inProgress.state).toBe('in_progress');
    expect(inProgress.assignment.state).toBe('on_site');
    expect(inProgress.schedule.state).toBe('in_progress');

    advanceHours(4);
    const completed = machine.completeWorkOrder(submitted.id);
    expect(completed.state).toBe('completed');
    expect(completed.assignment.state).toBe('completed');
    expect(completed.schedule.state).toBe('completed');
    expect(completed.closedAt?.getTime()).toBe(currentDate.getTime());
    expect(completed.sla.isActive).toBe(false);
    expect(completed.sla.isBreached).toBe(false);
  });

  it('prevents invalid state transitions', () => {
    const created = machine.createWorkOrder({ title: 'Invalid completion attempt' });
    machine.submitWorkOrder(created.id);

    expect(() => machine.completeWorkOrder(created.id)).toThrow(StateTransitionError);
  });

  it('validates scheduling windows', () => {
    const created = machine.createWorkOrder({ title: 'Bad schedule' });

    expect(() =>
      machine.scheduleWorkOrder(created.id, {
        start: new Date('2024-01-01T15:00:00Z'),
        end: new Date('2024-01-01T14:00:00Z'),
      }),
    ).toThrow('Schedule end must be after start time');
  });
});

describe('Scheduling integrations', () => {
  beforeEach(() => {
    defaultWorkOrderStore.clear();
  });

  afterEach(() => {
    defaultWorkOrderStore.clear();
  });

  it('produces an ICS feed for scheduled assignments', () => {
    const feed = generateICSFeed(
      [
        {
          workOrderId: '1',
          technicianId: 'tech-1',
          title: 'Service water heater',
          description: 'Annual inspection',
          start: new Date('2024-01-02T09:00:00Z'),
          end: new Date('2024-01-02T10:00:00Z'),
          location: 'Apartment 5',
          scheduleState: 'scheduled',
        },
      ],
      { calendarName: 'Technician 1', timeGenerated: BASE_DATE },
    );

    expect(feed).toContain('BEGIN:VCALENDAR');
    expect(feed).toContain('SUMMARY:Service water heater (scheduled)');
    expect(feed).toContain('END:VCALENDAR');
  });

  it('exposes the staff schedule through an ICS endpoint', async () => {
    const clock = () => new Date(BASE_DATE);
    const machine = new WorkOrderStateMachine(defaultWorkOrderStore, { clock });
    const workOrder = machine.createWorkOrder({ title: 'Clean gutters' });
    machine.submitWorkOrder(workOrder.id);
    machine.assignTechnician(workOrder.id, 'tech-42', {
      start: new Date('2024-01-01T10:00:00Z'),
      end: new Date('2024-01-01T11:00:00Z'),
      location: '123 Main St',
    });

    const request = new Request(
      'https://example.com/api/staff/schedule?staffId=tech-42',
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/calendar');
    const body = await response.text();
    expect(body).toContain('SUMMARY:Clean gutters (scheduled)');
  });
});
