import { NextRequest } from "next/server"
import { getStripe, getAppBaseUrl } from "@/lib/stripe"
import { createCompressedJsonResponse } from "@/lib/http/compression"

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe()
    const { customerId } = await req.json()
    if (!customerId || typeof customerId !== "string") {
      return createCompressedJsonResponse(
        req,
        { error: "customerId is required" },
        { status: 400 }
      )
    }
    const returnUrl = getAppBaseUrl() + "/payments"
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })
    return createCompressedJsonResponse(req, { url: session.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return createCompressedJsonResponse(
      req,
      { error: message },
      { status: 500 }
    )
  }
}


