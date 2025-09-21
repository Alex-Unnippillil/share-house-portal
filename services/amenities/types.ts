import { Json } from '@/lib/supabase';

export type BookingStatus = 'pending' | 'approved' | 'cancelled';

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface AmenityBlackout extends TimeRange {
  id?: string;
  reason?: string;
}

export interface AmenityQuota {
  daily?: number;
  weekly?: number;
  monthly?: number;
}

export interface BuildingRuleContext {
  amenity: Amenity;
  start: Date;
  end: Date;
  userId?: string;
  existingBookings: Booking[];
  userBookings: Booking[];
}

export interface BuildingRuleResult {
  passed: boolean;
  code?: string;
  message?: string;
}

export interface BuildingRule {
  id: string;
  description?: string;
  evaluate: (context: BuildingRuleContext) => Promise<BuildingRuleResult> | BuildingRuleResult;
}

export interface Amenity {
  id: string;
  name: string;
  buildingId: string;
  requiresApproval?: boolean;
  quota?: AmenityQuota;
  blackoutPeriods?: AmenityBlackout[];
  rules?: BuildingRule[];
  metadata?: Json;
}

export interface BookingBase {
  amenityId: string;
  userId: string;
  start: Date;
  end: Date;
  notes?: string;
  metadata?: Json;
}

export interface Booking extends BookingBase {
  id: string;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationReason?: string;
}

export interface BookingCreationInput extends BookingBase {
  status: BookingStatus;
  approvedAt?: Date;
  approvedBy?: string;
}

export interface BookingUpdateInput extends Partial<BookingBase> {
  status?: BookingStatus;
  approvedAt?: Date;
  approvedBy?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationReason?: string;
}

export interface BookingRequestInput extends BookingBase {}

export interface AvailabilityCheckOptions {
  userId?: string;
  ignoreBookingId?: string;
}

export interface RuleViolation {
  ruleId: string;
  message?: string;
  code?: string;
}

export interface QuotaViolation {
  period: 'daily' | 'weekly' | 'monthly';
  limit: number;
  existingBookings: Booking[];
}

export interface AvailabilityCheckResult {
  amenity: Amenity;
  isAvailable: boolean;
  conflicts: Booking[];
  blackoutConflicts: AmenityBlackout[];
  ruleViolations: RuleViolation[];
  quotaViolations: QuotaViolation[];
}

export interface BookingEventPayload {
  amenity: Amenity;
  booking: Booking;
}

export interface BookingCancelledPayload extends BookingEventPayload {
  cancelledBy: string;
  reason?: string;
}

export interface AmenityServiceEventMap {
  'booking:requested': BookingEventPayload;
  'booking:approved': BookingEventPayload;
  'booking:cancelled': BookingCancelledPayload;
}
