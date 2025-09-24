import { NextRequest } from "next/server"

import { jsonError, jsonErrorFromUnknown } from "@/lib/errors"
import { getAppBaseUrl, getStripe } from "@/lib/stripe"

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe()
    const { customerId } = await req.json()
    if (!customerId || typeof customerId !== "string") {
      return jsonError("REQUEST_VALIDATION_ERROR", {
        message: "customerId is required",
      })
    }
    const returnUrl = getAppBaseUrl() + "/payments"
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })
    return Response.json({ url: session.url })
  } catch (error) {
    return jsonErrorFromUnknown(error, "UPSTREAM_SERVICE_ERROR")
  }
}


