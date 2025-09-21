import { describe, expect, it } from 'vitest';

import type { DomainEvent } from '@/lib/events/domain-event';
import type { DomainEventPublisher } from '@/lib/events/domain-event';

import { InMemoryMaintenanceRepository } from '../repository';
import { MaintenanceService } from '../service';

class TestPublisher implements DomainEventPublisher {
  public readonly events: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.events.push(event);
  }
}

describe('MaintenanceService state transitions', () => {
  it('transitions to the requested state and records an event', async () => {
    const repository = new InMemoryMaintenanceRepository();
    const publisher = new TestPublisher();
    const service = new MaintenanceService(repository, publisher);

    const request = await service.createRequest({
      title: 'Leaky faucet',
      description: 'The kitchen faucet is leaking continuously.',
      requestedBy: 'resident-123',
    });

    const updated = await service.transitionState(request.id, {
      newState: 'in_progress',
      changedBy: 'manager-456',
      reason: 'Assigned to maintenance team.',
    });

    expect(updated.state).toBe('in_progress');
    expect(updated.history).toHaveLength(1);
    expect(updated.history[0]).toMatchObject({
      fromState: 'new',
      toState: 'in_progress',
      changedBy: 'manager-456',
      reason: 'Assigned to maintenance team.',
    });

    expect(publisher.events).toHaveLength(1);
    expect(publisher.events[0]).toMatchObject({
      type: 'maintenance.request.stateChanged',
      payload: {
        requestId: request.id,
        fromState: 'new',
        toState: 'in_progress',
        changedBy: 'manager-456',
        reason: 'Assigned to maintenance team.',
      },
    });
  });

  it('prevents invalid transitions and does not emit events', async () => {
    const repository = new InMemoryMaintenanceRepository();
    const publisher = new TestPublisher();
    const service = new MaintenanceService(repository, publisher);

    const request = await service.createRequest({
      title: 'Broken window',
      description: 'Bedroom window cracked after storm.',
      requestedBy: 'resident-789',
    });

    await expect(
      service.transitionState(request.id, {
        newState: 'completed',
        changedBy: 'manager-456',
      }),
    ).rejects.toThrow(/Cannot transition maintenance request/);

    expect(publisher.events).toHaveLength(0);
    const stored = await repository.getById(request.id);
    expect(stored?.state).toBe('new');
  });

  it('does not emit events when the state does not change', async () => {
    const repository = new InMemoryMaintenanceRepository();
    const publisher = new TestPublisher();
    const service = new MaintenanceService(repository, publisher);

    const request = await service.createRequest({
      title: 'Fence repair',
      description: 'Fence panel is loose.',
      requestedBy: 'resident-234',
    });

    const unchanged = await service.transitionState(request.id, {
      newState: 'new',
      changedBy: 'manager-456',
    });

    expect(unchanged.state).toBe('new');
    expect(unchanged.history).toHaveLength(0);
    expect(publisher.events).toHaveLength(0);
  });
});
