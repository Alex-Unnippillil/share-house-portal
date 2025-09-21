import { addHours } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  Amenity,
  AmenityBookingError,
  AmenityService,
  InMemoryAmenityRepository,
} from '../index';

const baseAmenity: Amenity = {
  id: 'amenity-1',
  name: 'Sky Lounge',
  buildingId: 'building-1',
};

const defaultStart = new Date('2025-06-10T10:00:00.000Z');
const defaultEnd = addHours(defaultStart, 1);

describe('AmenityService', () => {
  let repository: InMemoryAmenityRepository;
  let service: AmenityService;
  const now = new Date('2025-06-01T00:00:00.000Z');

  beforeEach(() => {
    repository = new InMemoryAmenityRepository();
    repository.addAmenity(baseAmenity);
    service = new AmenityService(repository, () => now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports availability when no conflicts or restrictions', async () => {
    const availability = await service.getAvailability(baseAmenity.id, defaultStart, defaultEnd, {
      userId: 'user-1',
    });

    expect(availability.isAvailable).toBe(true);
    expect(availability.conflicts).toHaveLength(0);
    expect(availability.quotaViolations).toHaveLength(0);
    expect(availability.ruleViolations).toHaveLength(0);
    expect(availability.blackoutConflicts).toHaveLength(0);
  });

  it('detects conflicts against existing bookings', async () => {
    await repository.createBooking({
      amenityId: baseAmenity.id,
      userId: 'user-2',
      start: defaultStart,
      end: defaultEnd,
      status: 'approved',
    });

    const availability = await service.getAvailability(baseAmenity.id, defaultStart, defaultEnd, {
      userId: 'user-1',
    });

    expect(availability.isAvailable).toBe(false);
    expect(availability.conflicts).toHaveLength(1);
  });

  it('enforces blackout periods', async () => {
    const blackoutAmenity: Amenity = {
      ...baseAmenity,
      id: 'amenity-2',
      blackoutPeriods: [
        {
          start: defaultStart,
          end: addHours(defaultStart, 2),
          reason: 'Maintenance',
        },
      ],
    };
    repository.addAmenity(blackoutAmenity);

    const availability = await service.getAvailability(blackoutAmenity.id, defaultStart, defaultEnd, {
      userId: 'user-1',
    });

    expect(availability.isAvailable).toBe(false);
    expect(availability.blackoutConflicts).toHaveLength(1);
  });

  it('enforces quota limits for users', async () => {
    const quotaAmenity: Amenity = {
      ...baseAmenity,
      id: 'amenity-3',
      quota: {
        daily: 1,
      },
    };
    repository.addAmenity(quotaAmenity);

    await repository.createBooking({
      amenityId: quotaAmenity.id,
      userId: 'user-1',
      start: defaultStart,
      end: defaultEnd,
      status: 'approved',
    });

    await expect(
      service.requestBooking({
        amenityId: quotaAmenity.id,
        userId: 'user-1',
        start: addHours(defaultStart, 2),
        end: addHours(defaultEnd, 2),
      }),
    ).rejects.toMatchObject({
      code: 'AVAILABILITY_CONFLICT',
      details: expect.objectContaining({
        quotaViolations: expect.arrayContaining([
          expect.objectContaining({ period: 'daily', limit: 1 }),
        ]),
      }),
    });
  });

  it('evaluates building rules', async () => {
    const ruleAmenity: Amenity = {
      ...baseAmenity,
      id: 'amenity-4',
      rules: [
        {
          id: 'max-duration',
          description: 'Maximum booking length is 1 hour',
          evaluate: ({ start, end }) => ({
            passed: end.getTime() - start.getTime() <= 60 * 60 * 1000,
            message: 'Bookings longer than 1 hour are not allowed',
          }),
        },
      ],
    };
    repository.addAmenity(ruleAmenity);

    await expect(
      service.requestBooking({
        amenityId: ruleAmenity.id,
        userId: 'user-1',
        start: defaultStart,
        end: addHours(defaultEnd, 2),
      }),
    ).rejects.toBeInstanceOf(AmenityBookingError);
  });

  it('emits booking requested event for amenities requiring approval', async () => {
    const approvalAmenity: Amenity = {
      ...baseAmenity,
      id: 'amenity-5',
      requiresApproval: true,
    };
    repository.addAmenity(approvalAmenity);

    const listener = vi.fn();
    service.on('booking:requested', listener);

    const booking = await service.requestBooking({
      amenityId: approvalAmenity.id,
      userId: 'user-1',
      start: defaultStart,
      end: defaultEnd,
    });

    expect(booking.status).toBe('pending');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      amenity: approvalAmenity,
      booking,
    });
  });

  it('auto-approves bookings when no approval is required', async () => {
    const autoAmenity: Amenity = {
      ...baseAmenity,
      id: 'amenity-6',
      requiresApproval: false,
    };
    repository.addAmenity(autoAmenity);

    const listener = vi.fn();
    service.on('booking:approved', listener);

    const booking = await service.requestBooking({
      amenityId: autoAmenity.id,
      userId: 'user-1',
      start: defaultStart,
      end: defaultEnd,
    });

    expect(booking.status).toBe('approved');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toMatchObject({
      amenity: autoAmenity,
      booking,
    });
  });

  it('approves pending bookings and emits an event', async () => {
    const amenity: Amenity = {
      ...baseAmenity,
      id: 'amenity-7',
      requiresApproval: true,
    };
    repository.addAmenity(amenity);

    const booking = await service.requestBooking({
      amenityId: amenity.id,
      userId: 'user-1',
      start: defaultStart,
      end: defaultEnd,
    });

    const listener = vi.fn();
    service.on('booking:approved', listener);

    const approved = await service.approveBooking(booking.id, 'manager-1');

    expect(approved.status).toBe('approved');
    expect(approved.approvedBy).toBe('manager-1');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('prevents approval when conflicts arise', async () => {
    const amenity: Amenity = {
      ...baseAmenity,
      id: 'amenity-8',
      requiresApproval: true,
    };
    repository.addAmenity(amenity);

    const pending = await repository.createBooking({
      amenityId: amenity.id,
      userId: 'user-1',
      start: defaultStart,
      end: defaultEnd,
      status: 'pending',
    });

    await repository.createBooking({
      amenityId: amenity.id,
      userId: 'user-2',
      start: defaultStart,
      end: defaultEnd,
      status: 'approved',
    });

    await expect(service.approveBooking(pending.id, 'manager-1')).rejects.toMatchObject({
      code: 'AVAILABILITY_CONFLICT',
    });
  });

  it('cancels bookings and notifies listeners', async () => {
    const amenity: Amenity = {
      ...baseAmenity,
      id: 'amenity-9',
      requiresApproval: false,
    };
    repository.addAmenity(amenity);

    const booking = await service.requestBooking({
      amenityId: amenity.id,
      userId: 'user-1',
      start: defaultStart,
      end: defaultEnd,
    });

    const listener = vi.fn();
    service.on('booking:cancelled', listener);

    const cancelled = await service.cancelBooking(booking.id, 'user-1', 'Change of plans');

    expect(cancelled.status).toBe('cancelled');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toMatchObject({
      cancelledBy: 'user-1',
      reason: 'Change of plans',
    });
  });
});
