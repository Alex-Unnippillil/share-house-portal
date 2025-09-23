import { z } from "zod"

import type { CatchUpBalance } from "@/types/payments"

import { calculateOutstanding } from "./catch-up"
import { formatCurrency, parseCurrencyInput } from "./currency"

export const createCatchUpFormSchema = (balances: CatchUpBalance[]) =>
  z
    .object({
      roommateId: z.string().min(1, "Select a roommate"),
      amount: z
        .string()
        .trim()
        .min(1, "Enter a payment amount")
        .refine((value) => !Number.isNaN(parseCurrencyInput(value)), {
          message: "Enter a valid amount",
        }),
      includePropertyManager: z.boolean().default(false),
      note: z
        .string()
        .trim()
        .max(280, "Note must be 280 characters or fewer")
        .optional(),
    })
    .superRefine((data, ctx) => {
      const amount = parseCurrencyInput(data.amount)

      if (!Number.isFinite(amount)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["amount"],
          message: "Enter a valid amount",
        })
        return
      }

      if (amount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["amount"],
          message: "Amount must be greater than zero",
        })
        return
      }

      const balance = balances.find((item) => item.roommateId === data.roommateId)
      if (!balance) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["roommateId"],
          message: "Selected roommate is no longer available",
        })
        return
      }

      const outstanding = calculateOutstanding(balance.charges)
      if (amount > outstanding) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["amount"],
          message: `Amount exceeds outstanding balance of ${formatCurrency(outstanding, { currency: balance.currency })}`,
        })
      }
    })

export type CatchUpFormSchema = ReturnType<typeof createCatchUpFormSchema>

