import { z } from "zod"

export const autopayFormSchema = z
  .object({
    rentAmount: z
      .number({ invalid_type_error: "Enter the monthly rent amount." })
      .positive("Rent amount must be greater than zero."),
    currency: z
      .string({ invalid_type_error: "Currency is required." })
      .min(1, "Currency is required."),
    dayOfMonth: z
      .number({ invalid_type_error: "Select a due date." })
      .int("Due date must be a whole number.")
      .min(1, "Due date must be at least the 1st of the month.")
      .max(31, "Due date must be within the calendar month."),
    firstChargeDate: z.date({ invalid_type_error: "Provide the first charge date." }),
    timezone: z.string().min(1, "Timezone is required."),
    gracePeriodDays: z
      .number({ invalid_type_error: "Grace period must be a number." })
      .int("Grace period must be a whole number of days.")
      .min(0, "Grace period cannot be negative.")
      .max(30, "Grace period cannot exceed 30 days."),
    autopayEnabled: z.boolean(),
    lateFeeType: z.enum(["flat", "percentage"]),
    lateFeeFlat: z
      .number({ invalid_type_error: "Late fee must be a number." })
      .min(0, "Late fee cannot be negative.")
      .optional(),
    lateFeePercent: z
      .number({ invalid_type_error: "Percentage must be a number." })
      .min(0, "Percentage cannot be negative.")
      .max(100, "Percentage cannot exceed 100%.")
      .optional(),
    lateFeeCap: z
      .number({ invalid_type_error: "Cap must be a number." })
      .min(0, "Cap cannot be negative.")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.lateFeeType === "flat" && data.lateFeeFlat == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lateFeeFlat"],
        message: "Enter the flat late fee that should be applied after the grace period.",
      })
    }

    if (data.lateFeeType === "percentage" && data.lateFeePercent == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lateFeePercent"],
        message: "Enter the percentage to use when calculating the late fee.",
      })
    }
  })

export type AutopayFormValues = z.infer<typeof autopayFormSchema>
