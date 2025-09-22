import { z } from 'zod';

import type { Json } from '../supabase';

type JsonValue = Json;

const jsonSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonSchema),
    z.record(z.union([jsonSchema, z.undefined()])),
  ]),
);

const timestampString = z.string().datetime({ offset: true });
const optionalTimestamp = timestampString.nullable();
const dateString = z.string().date();
const positiveId = z.number().int().positive();
const optionalPositiveId = positiveId.nullable();
const nonNegativeAmount = z.number().nonnegative();

const memberRoleEnum = z.enum(['roommate', 'tenant', 'property_manager', 'admin']);

export const householdRowSchema = z.object({
  id: positiveId,
  created_at: timestampString,
  updated_at: timestampString,
  name: z.string().min(1),
  timezone: z.string().nullable(),
  metadata: jsonSchema,
});

export const memberRowSchema = z.object({
  id: positiveId,
  created_at: timestampString,
  updated_at: timestampString,
  household_id: positiveId,
  user_id: z.string().uuid(),
  role: memberRoleEnum,
  display_name: z.string().nullable(),
  email: z.string().nullable(),
  phone_number: z.string().nullable(),
});

export const amenityRowSchema = z.object({
  id: positiveId,
  created_at: timestampString,
  updated_at: timestampString,
  household_id: positiveId,
  name: z.string().min(1),
  description: z.string().nullable(),
  location: z.string().nullable(),
  is_active: z.boolean(),
});

export const bookingRowSchema = z
  .object({
    id: positiveId,
    created_at: timestampString,
    updated_at: timestampString,
    household_id: positiveId,
    amenity_id: positiveId,
    member_id: positiveId,
    start_time: timestampString,
    end_time: timestampString,
    status: z.string().min(1),
    notes: z.string().nullable(),
  })
  .refine(
    ({ start_time, end_time }) => new Date(end_time).getTime() > new Date(start_time).getTime(),
    {
      message: 'end_time must be after start_time',
      path: ['end_time'],
    },
  );

export const choreRowSchema = z.object({
  id: positiveId,
  created_at: timestampString,
  updated_at: timestampString,
  household_id: positiveId,
  title: z.string().min(1),
  description: z.string().nullable(),
  frequency: z.string().nullable(),
  recurrence_rule: z.string().nullable(),
});

export const choreAssignmentRowSchema = z.object({
  id: positiveId,
  created_at: timestampString,
  updated_at: timestampString,
  household_id: positiveId,
  chore_id: positiveId,
  member_id: positiveId,
  due_at: optionalTimestamp,
  completed_at: optionalTimestamp,
  status: z.string().min(1),
});

export const supplyItemRowSchema = z.object({
  id: positiveId,
  created_at: timestampString,
  updated_at: timestampString,
  household_id: positiveId,
  name: z.string().min(1),
  description: z.string().nullable(),
  category: z.string().nullable(),
  restock_interval_days: z.number().int().nonnegative().nullable(),
});

export const supplyPurchaseRowSchema = z.object({
  id: positiveId,
  created_at: timestampString,
  updated_at: timestampString,
  household_id: positiveId,
  supply_item_id: positiveId,
  member_id: positiveId,
  purchased_at: timestampString,
  total_cost: nonNegativeAmount,
  receipt_url: z.string().nullable(),
  notes: z.string().nullable(),
});

export const supplyShareRowSchema = z.object({
  id: positiveId,
  created_at: timestampString,
  updated_at: timestampString,
  household_id: positiveId,
  supply_purchase_id: positiveId,
  member_id: positiveId,
  amount: nonNegativeAmount,
  status: z.string().min(1),
});

export const leaseRowSchema = z.object({
  id: positiveId,
  created_at: timestampString,
  updated_at: timestampString,
  household_id: positiveId,
  member_id: optionalPositiveId,
  title: z.string().min(1),
  document_url: z.string().nullable(),
  start_date: dateString,
  end_date: dateString.nullable(),
  status: z.string().min(1),
});

export const invoiceRowSchema = z.object({
  id: positiveId,
  created_at: timestampString,
  updated_at: timestampString,
  household_id: positiveId,
  lease_id: optionalPositiveId,
  member_id: optionalPositiveId,
  amount: nonNegativeAmount,
  due_date: dateString,
  issued_date: dateString,
  status: z.string().min(1),
  description: z.string().nullable(),
});

export const paymentRowSchema = z.object({
  id: positiveId,
  created_at: timestampString,
  updated_at: timestampString,
  household_id: positiveId,
  invoice_id: positiveId,
  member_id: positiveId,
  amount: nonNegativeAmount,
  paid_at: optionalTimestamp,
  status: z.string().min(1),
  provider_payment_id: z.string().nullable(),
  method: z.string().nullable(),
});

export const threadRowSchema = z.object({
  id: positiveId,
  created_at: timestampString,
  updated_at: timestampString,
  household_id: positiveId,
  member_id: optionalPositiveId,
  title: z.string().min(1),
  description: z.string().nullable(),
  last_activity_at: timestampString,
});

export const messageRowSchema = z.object({
  id: positiveId,
  created_at: timestampString,
  updated_at: timestampString,
  household_id: positiveId,
  thread_id: positiveId,
  member_id: positiveId,
  body: z.string().min(1),
  metadata: jsonSchema,
  edited_at: optionalTimestamp,
});

export const floorplanRowSchema = z.object({
  id: positiveId,
  created_at: timestampString,
  updated_at: timestampString,
  household_id: positiveId,
  name: z.string().min(1),
  storage_path: z.string().min(1),
  description: z.string().nullable(),
});

export const overlayShapeRowSchema = z.object({
  id: positiveId,
  created_at: timestampString,
  updated_at: timestampString,
  household_id: positiveId,
  floorplan_id: positiveId,
  member_id: optionalPositiveId,
  label: z.string().min(1),
  geometry: jsonSchema,
  color: z.string().nullable(),
  metadata: jsonSchema,
});

export const garbageEventRowSchema = z.object({
  id: positiveId,
  created_at: timestampString,
  updated_at: timestampString,
  household_id: positiveId,
  member_id: optionalPositiveId,
  scheduled_for: timestampString,
  status: z.string().min(1),
  notes: z.string().nullable(),
});

export type HouseholdRow = z.infer<typeof householdRowSchema>;
export type MemberRow = z.infer<typeof memberRowSchema>;
export type AmenityRow = z.infer<typeof amenityRowSchema>;
export type BookingRow = z.infer<typeof bookingRowSchema>;
export type ChoreRow = z.infer<typeof choreRowSchema>;
export type ChoreAssignmentRow = z.infer<typeof choreAssignmentRowSchema>;
export type SupplyItemRow = z.infer<typeof supplyItemRowSchema>;
export type SupplyPurchaseRow = z.infer<typeof supplyPurchaseRowSchema>;
export type SupplyShareRow = z.infer<typeof supplyShareRowSchema>;
export type LeaseRow = z.infer<typeof leaseRowSchema>;
export type InvoiceRow = z.infer<typeof invoiceRowSchema>;
export type PaymentRow = z.infer<typeof paymentRowSchema>;
export type ThreadRow = z.infer<typeof threadRowSchema>;
export type MessageRow = z.infer<typeof messageRowSchema>;
export type FloorplanRow = z.infer<typeof floorplanRowSchema>;
export type OverlayShapeRow = z.infer<typeof overlayShapeRowSchema>;
export type GarbageEventRow = z.infer<typeof garbageEventRowSchema>;
