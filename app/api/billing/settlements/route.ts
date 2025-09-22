import Stripe from "stripe"
import { z } from "zod"

import { recordPayment } from "@/lib/payments-ledger"

const adjustmentSchema = z.object({
  roommate: z.string().min(1, "roommate is required"),
  amount: z.coerce.number().positive("amount must be greater than zero"),
  memo: z.string().optional(),
})

const supplySchema = z.object({
  vendor: z.string().min(1, "vendor is required"),
  purchaseDate: z
    .string()
    .min(1, "purchaseDate is required")
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "purchaseDate must be a valid ISO-8601 date string",
    }),
  total: z.coerce.number().positive("total must be greater than zero"),
  memo: z.string().optional(),
  adjustments: z.array(adjustmentSchema).default([]),
})

const settlementSchema = z.object({
  mode: z.enum(["invoice", "payment_intent"]),
  supply: supplySchema,
})

type SettlementPayload = z.infer<typeof settlementSchema>

type InvoiceResponse = {
  status: "queued_for_invoice"
  invoiceAdjustmentRows: Array<{
    lineItem: number
    roommate: string
    amount: number
    memo?: string
  }>
  paymentRecordId: string
  totalAdjustmentAmount: number
  remainingBalance: number
}

type PaymentIntentResponse = {
  status: "payment_intent_created"
  paymentIntentId: string
  paymentIntentClientSecret: string | null
  paymentRecordId: string
  amount: number
}

type ErrorResponse = {
  error: string
  details?: unknown
}

function json<ResponseBody>(body: ResponseBody, init?: ResponseInit) {
  return Response.json(body, init)
}

export async function POST(request: Request) {
  let payload: SettlementPayload

  try {
    const raw = await request.json()
    payload = settlementSchema.parse(raw)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json<ErrorResponse>(
        {
          error: "Invalid settlement payload",
          details: error.flatten(),
        },
        { status: 422 },
      )
    }

    return json<ErrorResponse>(
      {
        error: "Failed to parse request body",
      },
      { status: 400 },
    )
  }

  const { mode, supply } = payload

  if (mode === "invoice") {
    if (supply.adjustments.length === 0) {
      return json<ErrorResponse>(
        {
          error: "At least one invoice adjustment is required",
        },
        { status: 422 },
      )
    }

    const totalAdjustmentAmount = supply.adjustments.reduce((sum, adjustment) => sum + adjustment.amount, 0)
    const remainingBalance = Number((supply.total - totalAdjustmentAmount).toFixed(2))

    const paymentRecord = recordPayment({
      mode,
      vendor: supply.vendor,
      purchaseDate: supply.purchaseDate,
      total: supply.total,
      memo: supply.memo,
      adjustments: supply.adjustments.map((item) => ({
        roommate: item.roommate,
        amount: Number(item.amount.toFixed(2)),
        memo: item.memo,
      })),
      status: "queued_for_invoice",
    })

    const responseBody: InvoiceResponse = {
      status: "queued_for_invoice",
      invoiceAdjustmentRows: supply.adjustments.map((adjustment, index) => ({
        lineItem: index + 1,
        roommate: adjustment.roommate,
        amount: Number(adjustment.amount.toFixed(2)),
        memo: adjustment.memo,
      })),
      paymentRecordId: paymentRecord.id,
      totalAdjustmentAmount: Number(totalAdjustmentAmount.toFixed(2)),
      remainingBalance,
    }

    return json(responseBody)
  }

  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    return json<ErrorResponse>(
      {
        error: "Stripe secret key is not configured",
      },
      { status: 500 },
    )
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: "2024-06-20",
  })

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(supply.total * 100),
      currency: "usd",
      metadata: {
        vendor: supply.vendor,
        purchase_date: supply.purchaseDate,
      },
      description: supply.memo ?? `Supply settlement for ${supply.vendor}`,
    })

    const paymentRecord = recordPayment({
      mode,
      vendor: supply.vendor,
      purchaseDate: supply.purchaseDate,
      total: supply.total,
      memo: supply.memo,
      adjustments: supply.adjustments.map((item) => ({
        roommate: item.roommate,
        amount: Number(item.amount.toFixed(2)),
        memo: item.memo,
      })),
      status: "payment_intent_created",
      reference: paymentIntent.id,
    })

    const responseBody: PaymentIntentResponse = {
      status: "payment_intent_created",
      paymentIntentId: paymentIntent.id,
      paymentIntentClientSecret: paymentIntent.client_secret ?? null,
      paymentRecordId: paymentRecord.id,
      amount: Number(supply.total.toFixed(2)),
    }

    return json(responseBody)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create Stripe PaymentIntent for supply settlement"

    return json<ErrorResponse>(
      {
        error: message,
      },
      { status: 502 },
    )
  }
}
