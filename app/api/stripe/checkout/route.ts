import { NextRequest } from "next/server"
import type Stripe from "stripe"

import { jsonError, jsonErrorFromUnknown } from "@/lib/errors"
import { getAppBaseUrl, getStripe } from "@/lib/stripe"
import { checkoutBodySchema } from "./schema"

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe()
    const payload = await req.json()
    const validation = checkoutBodySchema.safeParse(payload)

    if (!validation.success) {
      return jsonError("REQUEST_VALIDATION_ERROR", {
        message: "Invalid checkout configuration",
        details: validation.error.flatten(),
      })
    }

    const { priceId, quantity, mode, metadata } = validation.data

    const baseUrl = getAppBaseUrl()

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode,
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      success_url: `${baseUrl}/payments?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payments?status=cancelled`,
    }

    // Add metadata if provided
    if (metadata) {
      sessionConfig.metadata = metadata
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    return Response.json({ id: session.id, url: session.url })
  } catch (error) {
    return jsonErrorFromUnknown(error, "UPSTREAM_SERVICE_ERROR")
  }
}


