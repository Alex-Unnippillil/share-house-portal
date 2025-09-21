import { EventEmitter } from 'eventemitter3';
import {
  areIntervalsOverlapping,
  endOfDay,
  endOfMonth,
  endOfWeek,
  isBefore,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

import { AmenityBookingError } from './errors';
import { AmenityRepository, BookingQueryFilters } from './repository';
import {
  Amenity,
  AmenityServiceEventMap,
  AvailabilityCheckOptions,
  AvailabilityCheckResult,
  Booking,
  BookingCancelledPayload,
  BookingEventPayload,
  BookingRequestInput,
  BookingStatus,
  QuotaViolation,
  RuleViolation,
} from './types';

const ACTIVE_STATUSES: BookingStatus[] = ['pending', 'approved'];

export class AmenityService extends EventEmitter<AmenityServiceEventMap> {
  constructor(
    private readonly repository: AmenityRepository,
    private readonly now: () => Date = () => new Date(),
  ) {
    super();
  }

  async getAvailability(
    amenityId: string,
    start: Date,
    end: Date,
    options: AvailabilityCheckOptions = {},
  ): Promise<AvailabilityCheckResult> {
    this.validateTimeRange(start, end);

    const amenity = await this.repository.getAmenityById(amenityId);
    if (!amenity) {
      throw new AmenityBookingError('AMENITY_NOT_FOUND', `Amenity ${amenityId} not found`);
    }

    const bookings = await this.repository.listBookingsForAmenity(amenityId, {
      rangeStart: start,
      rangeEnd: end,
      ignoreBookingId: options.ignoreBookingId,
      statuses: ACTIVE_STATUSES,
    });

    const conflicts = bookings.filter((booking) =>
      areIntervalsOverlapping(
        { start: booking.start, end: booking.end },
        { start, end },
        { inclusive: false },
      ),
    );

    const blackoutConflicts = (amenity.blackoutPeriods ?? []).filter((period) =>
      areIntervalsOverlapping({ start: period.start, end: period.end }, { start, end }, { inclusive: true }),
    );

    const [quotaViolations, ruleViolations] = await Promise.all([
      this.evaluateQuotas(amenity, start, options),
      this.evaluateRules(amenity, start, end, options, bookings),
    ]);

    const isAvailable =
      conflicts.length === 0 &&
      blackoutConflicts.length === 0 &&
      quotaViolations.length === 0 &&
      ruleViolations.length === 0;

    return {
      amenity,
      isAvailable,
      conflicts,
      blackoutConflicts,
      quotaViolations,
      ruleViolations,
    };
  }

  async requestBooking(input: BookingRequestInput): Promise<Booking> {
    const availability = await this.getAvailability(input.amenityId, input.start, input.end, {
      userId: input.userId,
    });

    if (!availability.isAvailable) {
      throw new AmenityBookingError('AVAILABILITY_CONFLICT', 'Amenity is not available', availability);
    }

    const status: BookingStatus = availability.amenity.requiresApproval ? 'pending' : 'approved';
    const now = this.now();

    const booking = await this.repository.createBooking({
      ...input,
      status,
      approvedAt: status === 'approved' ? now : undefined,
      approvedBy: status === 'approved' ? input.userId : undefined,
    });

    const payload: BookingEventPayload = {
      amenity: availability.amenity,
      booking,
    };

    if (status === 'pending') {
      this.emit('booking:requested', payload);
    } else {
      this.emit('booking:approved', payload);
    }

    return booking;
  }

  async approveBooking(bookingId: string, approverId: string): Promise<Booking> {
    const booking = await this.repository.getBookingById(bookingId);
    if (!booking) {
      throw new AmenityBookingError('BOOKING_NOT_FOUND', `Booking ${bookingId} not found`);
    }

    if (booking.status !== 'pending') {
      throw new AmenityBookingError('INVALID_OPERATION', 'Only pending bookings can be approved');
    }

    const amenity = await this.repository.getAmenityById(booking.amenityId);
    if (!amenity) {
      throw new AmenityBookingError('AMENITY_NOT_FOUND', `Amenity ${booking.amenityId} not found`);
    }

    if (!amenity.requiresApproval) {
      throw new AmenityBookingError('INVALID_OPERATION', 'Amenity does not require approval');
    }

    const availability = await this.getAvailability(booking.amenityId, booking.start, booking.end, {
      userId: booking.userId,
      ignoreBookingId: booking.id,
    });

    if (!availability.isAvailable) {
      throw new AmenityBookingError('AVAILABILITY_CONFLICT', 'Amenity is not available', availability);
    }

    const now = this.now();
    const updated = await this.repository.updateBooking(bookingId, {
      status: 'approved',
      approvedAt: now,
      approvedBy: approverId,
    });

    const payload: BookingEventPayload = {
      amenity,
      booking: updated,
    };

    this.emit('booking:approved', payload);

    return updated;
  }

  async cancelBooking(bookingId: string, actorId: string, reason?: string): Promise<Booking> {
    const booking = await this.repository.getBookingById(bookingId);
    if (!booking) {
      throw new AmenityBookingError('BOOKING_NOT_FOUND', `Booking ${bookingId} not found`);
    }

    if (booking.status === 'cancelled') {
      return booking;
    }

    const amenity = await this.repository.getAmenityById(booking.amenityId);
    if (!amenity) {
      throw new AmenityBookingError('AMENITY_NOT_FOUND', `Amenity ${booking.amenityId} not found`);
    }

    const updated = await this.repository.updateBooking(bookingId, {
      status: 'cancelled',
      cancelledAt: this.now(),
      cancelledBy: actorId,
      cancellationReason: reason,
    });

    const payload: BookingCancelledPayload = {
      amenity,
      booking: updated,
      cancelledBy: actorId,
      reason,
    };

    this.emit('booking:cancelled', payload);

    return updated;
  }

  private validateTimeRange(start: Date, end: Date) {
    if (!isBefore(start, end)) {
      throw new AmenityBookingError('INVALID_TIME_RANGE', 'Start time must be before end time');
    }
  }

  private async evaluateRules(
    amenity: Amenity,
    start: Date,
    end: Date,
    options: AvailabilityCheckOptions,
    existingBookings: Booking[],
  ): Promise<RuleViolation[]> {
    const rules = amenity.rules ?? [];
    if (rules.length === 0) {
      return [];
    }

    const userId = options.userId;
    const userBookings = userId
      ? await this.repository.listBookingsForUser(userId, {
          amenityId: amenity.id,
          statuses: ACTIVE_STATUSES,
          rangeStart: startOfMonth(start),
          rangeEnd: endOfMonth(end),
          ignoreBookingId: options.ignoreBookingId,
        })
      : [];

    const violations: RuleViolation[] = [];

    for (const rule of rules) {
      const result = await rule.evaluate({
        amenity,
        start,
        end,
        userId,
        existingBookings,
        userBookings,
      });

      if (!result.passed) {
        violations.push({
          ruleId: rule.id,
          code: result.code,
          message: result.message,
        });
      }
    }

    return violations;
  }

  private async evaluateQuotas(
    amenity: Amenity,
    start: Date,
    options: AvailabilityCheckOptions,
  ): Promise<QuotaViolation[]> {
    const quota = amenity.quota;
    const userId = options.userId;

    if (!quota || !userId) {
      return [];
    }

    const violations: QuotaViolation[] = [];
    const statuses = ACTIVE_STATUSES;
    const sharedFilters: Omit<BookingQueryFilters, 'rangeStart' | 'rangeEnd'> = {
      amenityId: amenity.id,
      statuses,
      ignoreBookingId: options.ignoreBookingId,
    };

    if (quota.daily) {
      const dayStart = startOfDay(start);
      const dayEnd = endOfDay(start);
      const dayBookings = await this.repository.listBookingsForUser(userId, {
        ...sharedFilters,
        rangeStart: dayStart,
        rangeEnd: dayEnd,
      });

      if (dayBookings.length >= quota.daily) {
        violations.push({
          period: 'daily',
          limit: quota.daily,
          existingBookings: dayBookings,
        });
      }
    }

    if (quota.weekly) {
      const weekStart = startOfWeek(start, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(start, { weekStartsOn: 0 });
      const weekBookings = await this.repository.listBookingsForUser(userId, {
        ...sharedFilters,
        rangeStart: weekStart,
        rangeEnd: weekEnd,
      });

      if (weekBookings.length >= quota.weekly) {
        violations.push({
          period: 'weekly',
          limit: quota.weekly,
          existingBookings: weekBookings,
        });
      }
    }

    if (quota.monthly) {
      const monthStart = startOfMonth(start);
      const monthEnd = endOfMonth(start);
      const monthBookings = await this.repository.listBookingsForUser(userId, {
        ...sharedFilters,
        rangeStart: monthStart,
        rangeEnd: monthEnd,
      });

      if (monthBookings.length >= quota.monthly) {
        violations.push({
          period: 'monthly',
          limit: quota.monthly,
          existingBookings: monthBookings,
        });
      }
    }

    return violations;
  }
}
