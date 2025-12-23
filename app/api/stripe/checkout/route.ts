import type Stripe from "stripe"

import { jsonError, jsonErrorFromUnknown } from "@/lib/errors"
import { getAppBaseUrl, getStripe } from "@/lib/stripe"
import { parseRequestJson } from "@/lib/validation"
import { checkoutSessionPayloadSchema } from "@/lib/validation/stripe"

export async function POST(request: Request) {
  const validationResult = await parseRequestJson(
    request,
    checkoutSessionPayloadSchema,
    { validationErrorMessage: "Invalid checkout session payload." }
  )

  if (!validationResult.success) {
    return validationResult.error
  }

  const { priceId, quantity, mode, metadata } = validationResult.data

  try {
    const stripe = getStripe()
    const baseUrl = getAppBaseUrl()
    const sessionMode = mode ?? "payment"
    const lineQuantity = quantity ?? 1

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: sessionMode,
      line_items: [
        {
          price: priceId,
          quantity: lineQuantity,
        },
      ],
      success_url: `${baseUrl}/payments?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payments?status=cancelled`,
    }

    if (metadata) {
      sessionConfig.metadata = metadata
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    return Response.json({ id: session.id, url: session.url })
  } catch (error) {
    if (error instanceof Error && error.message.includes("Stripe is not configured")) {
      return jsonError("CONFIGURATION_ERROR", { message: error.message })
    }

    return jsonErrorFromUnknown(error, "UPSTREAM_SERVICE_ERROR")
  }
}
