import { areIntervalsOverlapping } from 'date-fns';

import { AmenityBookingError } from './errors';
import { AmenityRepository, BookingQueryFilters } from './repository';
import {
  Amenity,
  Booking,
  BookingCreationInput,
  BookingStatus,
  BookingUpdateInput,
} from './types';

const ACTIVE_STATUSES: BookingStatus[] = ['pending', 'approved'];

interface StoredBooking extends Booking {}

export class InMemoryAmenityRepository implements AmenityRepository {
  private readonly amenities = new Map<string, Amenity>();
  private readonly bookings = new Map<string, StoredBooking>();
  private bookingCounter = 0;

  setAmenities(amenities: Amenity[]) {
    amenities.forEach((amenity) => {
      this.amenities.set(amenity.id, amenity);
    });
  }

  setBookings(bookings: Booking[]) {
    this.bookings.clear();
    bookings.forEach((booking) => {
      this.bookings.set(booking.id, booking);
    });
  }

  addAmenity(amenity: Amenity) {
    this.amenities.set(amenity.id, amenity);
  }

  async getAmenityById(amenityId: string): Promise<Amenity | null> {
    return this.amenities.get(amenityId) ?? null;
  }

  async getBookingById(bookingId: string): Promise<Booking | null> {
    return this.bookings.get(bookingId) ?? null;
  }

  async listBookingsForAmenity(
    amenityId: string,
    filters: BookingQueryFilters = {},
  ): Promise<Booking[]> {
    const bookings = Array.from(this.bookings.values()).filter(
      (booking) => booking.amenityId === amenityId,
    );
    return this.applyFilters(bookings, filters);
  }

  async listBookingsForUser(
    userId: string,
    filters: BookingQueryFilters = {},
  ): Promise<Booking[]> {
    const bookings = Array.from(this.bookings.values()).filter(
      (booking) => booking.userId === userId,
    );
    return this.applyFilters(bookings, filters);
  }

  async createBooking(payload: BookingCreationInput): Promise<Booking> {
    const id = `booking-${++this.bookingCounter}`;
    const createdAt = new Date();
    const booking: Booking = {
      id,
      createdAt,
      updatedAt: createdAt,
      ...payload,
    };
    this.bookings.set(id, booking);
    return booking;
  }

  async updateBooking(bookingId: string, updates: BookingUpdateInput): Promise<Booking> {
    const existing = this.bookings.get(bookingId);
    if (!existing) {
      throw new AmenityBookingError('BOOKING_NOT_FOUND', `Booking ${bookingId} not found`);
    }

    const updated: Booking = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    this.bookings.set(bookingId, updated);
    return updated;
  }

  private applyFilters(bookings: Booking[], filters: BookingQueryFilters): Booking[] {
    return bookings.filter((booking) => {
      if (filters.ignoreBookingId && booking.id === filters.ignoreBookingId) {
        return false;
      }

      if (filters.amenityId && booking.amenityId !== filters.amenityId) {
        return false;
      }

      const statuses = filters.statuses ?? ACTIVE_STATUSES;
      if (!statuses.includes(booking.status)) {
        return false;
      }

      if (filters.rangeStart && filters.rangeEnd) {
        const overlaps = areIntervalsOverlapping(
          { start: booking.start, end: booking.end },
          { start: filters.rangeStart, end: filters.rangeEnd },
          { inclusive: true },
        );
        if (!overlaps) {
          return false;
        }
      }

      return true;
    });
  }
}
