import { z } from "zod"

const quantitySchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null) {
      return undefined
    }

    if (typeof value === "number") {
      return value
    }

    if (typeof value === "string") {
      const trimmed = value.trim()
      if (trimmed === "") {
        return Number.NaN
      }

      const parsed = Number(trimmed)
      if (!Number.isFinite(parsed)) {
        return Number.NaN
      }
      return parsed
    }

    return Number.NaN
  },
  z
    .number({ invalid_type_error: "quantity must be a positive integer" })
    .int({ message: "quantity must be a positive integer" })
    .positive({ message: "quantity must be a positive integer" })
)

const modeSchema = z
  .enum(["payment", "subscription"], {
    errorMap: () => ({ message: "mode must be payment or subscription" }),
  })

export const checkoutBodySchema = z.object({
  priceId: z
    .string({ required_error: "priceId is required" })
    .trim()
    .min(1, "priceId is required"),
  quantity: quantitySchema.optional().default(1),
  mode: modeSchema.optional().default("payment"),
  metadata: z
    .record(z.string({ invalid_type_error: "metadata values must be strings" }), {
      invalid_type_error: "metadata must be an object with string values",
    })
    .optional(),
})

export type CheckoutBody = z.infer<typeof checkoutBodySchema>

