import { z } from "zod"

export const emailNotificationPayloadSchema = z.object({
  to: z.union([
    z.string().min(1, "Recipient is required"),
    z
      .array(z.string().min(1, "Recipient email must not be empty"))
      .nonempty("At least one recipient is required"),
  ]),
  subject: z.string().min(1, "Subject is required"),
  template: z.string().min(1, "Template is required"),
  data: z.record(z.any()).optional(),
  userId: z.string().min(1, "userId must not be empty").optional(),
})

export type EmailNotificationPayload = z.infer<
  typeof emailNotificationPayloadSchema
>

export const inAppNotificationPayloadSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  title: z.string().min(1, "title is required"),
  message: z.string().min(1, "message is required"),
  type: z.enum(["info", "success", "warning", "error"]),
  actionUrl: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

export type InAppNotificationPayload = z.infer<
  typeof inAppNotificationPayloadSchema
>

const bulkNotificationEntrySchema = z.union([
  emailNotificationPayloadSchema,
  inAppNotificationPayloadSchema,
])

export const notificationRequestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("email"),
    notification: emailNotificationPayloadSchema,
  }),
  z.object({
    type: z.literal("in-app"),
    notification: inAppNotificationPayloadSchema,
  }),
  z.object({
    type: z.literal("bulk"),
    notifications: z
      .array(bulkNotificationEntrySchema)
      .nonempty("notifications must contain at least one entry"),
  }),
])

export type NotificationRequest = z.infer<typeof notificationRequestSchema>
