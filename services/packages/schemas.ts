import { z } from 'zod'

export const packageIntakeSchema = z.object({
  barcode: z.string().min(1).optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.string().optional(),
  userId: z.string().min(1),
  createdBy: z.string().min(1),
  recipientEmail: z.string().email().optional(),
  recipientName: z.string().optional(),
  notifyRecipient: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const packageLookupSchema = z.object({
  barcode: z.string().min(1),
})

export const packagePickupSchema = z.object({
  packageId: z.string().min(1),
  signature: z.string().min(1),
  pickedUpBy: z.string().min(1),
  pickedUpAt: z.string().datetime().optional(),
  notes: z.string().optional(),
  recipientEmail: z.string().email().optional(),
  recipientName: z.string().optional(),
})

export const reminderSchema = z.object({
  packageIds: z.array(z.string().min(1)).min(1),
  message: z.string().optional(),
  remindAfterDays: z.number().min(0).max(365).default(0),
})

export const bulkActionSchema = z.object({
  packageIds: z.array(z.string().min(1)).min(1),
  action: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('status'),
      status: z.string().min(1),
    }),
    z.object({
      type: z.literal('reminder'),
      message: z.string().optional(),
      remindAfterDays: z.number().min(0).max(365).optional(),
    }),
  ]),
})

export const reportingSchema = z.object({
  rangeDays: z.number().min(1).max(365).default(30),
})

export const staffOverviewSchema = z.object({
  rangeDays: z.number().min(1).max(365).default(30),
})

export type PackageIntakeInput = z.infer<typeof packageIntakeSchema>
export type PackageLookupInput = z.infer<typeof packageLookupSchema>
export type PackagePickupInput = z.infer<typeof packagePickupSchema>
export type ReminderInput = z.infer<typeof reminderSchema>
export type BulkActionInput = z.infer<typeof bulkActionSchema>
export type ReportingInput = z.infer<typeof reportingSchema>
export type StaffOverviewInput = z.infer<typeof staffOverviewSchema>
