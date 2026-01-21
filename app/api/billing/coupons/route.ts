import { NextRequest } from "next/server"
import { z } from "zod"

import { validateCouponCode } from "@/lib/payments/coupons"

const requestSchema = z.object({
  code: z.string().trim().min(1, "Coupon code is required").max(64),
  planId: z.string().trim().min(1, "Plan is required"),
  tenantStatus: z.enum(["new", "existing"]),
  isTrialActive: z.boolean().default(false),
  commitmentMonths: z.number().int().positive().max(36).default(12),
})

export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const parsed = requestSchema.parse(json)

    const result = await validateCouponCode(parsed.code, parsed, {
      now: new Date(),
    })

    return Response.json(result, { status: result.valid ? 200 : 422 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          error: "Invalid request",
          issues: error.issues,
        },
        { status: 400 }
      )
    }

    console.error("coupon validation error", error)

    return Response.json(
      { error: "Unable to validate coupon" },
      { status: 500 }
    )
  }
}

