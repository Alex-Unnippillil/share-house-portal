import {
  Amenity,
  AvailabilityCheckOptions,
  Booking,
  BookingCreationInput,
  BookingStatus,
  BookingUpdateInput,
} from './types';

export interface BookingQueryFilters extends AvailabilityCheckOptions {
  rangeStart?: Date;
  rangeEnd?: Date;
  statuses?: BookingStatus[];
  amenityId?: string;
}

export interface AmenityRepository {
  getAmenityById: (amenityId: string) => Promise<Amenity | null>;
  getBookingById: (bookingId: string) => Promise<Booking | null>;
  listBookingsForAmenity: (
    amenityId: string,
    filters?: BookingQueryFilters,
  ) => Promise<Booking[]>;
  listBookingsForUser: (userId: string, filters?: BookingQueryFilters) => Promise<Booking[]>;
  createBooking: (payload: BookingCreationInput) => Promise<Booking>;
  updateBooking: (bookingId: string, updates: BookingUpdateInput) => Promise<Booking>;
}
