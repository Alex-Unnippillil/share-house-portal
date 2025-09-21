export type AmenityBookingErrorCode =
  | 'AMENITY_NOT_FOUND'
  | 'BOOKING_NOT_FOUND'
  | 'INVALID_TIME_RANGE'
  | 'AVAILABILITY_CONFLICT'
  | 'INVALID_OPERATION';

export class AmenityBookingError<T = unknown> extends Error {
  public readonly code: AmenityBookingErrorCode;
  public readonly details?: T;

  constructor(code: AmenityBookingErrorCode, message: string, details?: T) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'AmenityBookingError';
  }
}
