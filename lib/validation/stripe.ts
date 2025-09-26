import { z } from "zod"

export const checkoutSessionPayloadSchema = z.object({
  priceId: z
    .string({ required_error: "priceId is required" })
    .min(1, "priceId is required"),
  quantity: z
    .number({ invalid_type_error: "quantity must be a number" })
    .int("quantity must be an integer")
    .positive("quantity must be greater than 0")
    .optional(),
  mode: z.enum(["payment", "subscription"]).optional(),
  metadata: z
    .record(z.string(), { invalid_type_error: "metadata must be an object" })
    .optional(),
})

export type CheckoutSessionPayload = z.infer<
  typeof checkoutSessionPayloadSchema
>

export const billingPortalPayloadSchema = z.object({
  customerId: z
    .string({ required_error: "customerId is required" })
    .min(1, "customerId is required"),
})

export type BillingPortalPayload = z.infer<typeof billingPortalPayloadSchema>
