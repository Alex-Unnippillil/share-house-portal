import { NextRequest } from "next/server"

import { jsonError, jsonErrorFromUnknown } from "@/lib/errors"
import { createStructuredLogger } from "@/lib/observability/logger"
import { incrementOperationalMetric } from "@/lib/observability/metrics"
import { getAppBaseUrl, getStripe } from "@/lib/stripe"

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID()
  const logger = createStructuredLogger("route_handler", {
    component: "stripe_checkout_route",
    requestId,
  })

  try {
    const stripe = getStripe()
    const { priceId, quantity = 1, mode = "payment", metadata } = await req.json()

    if (!priceId || typeof priceId !== "string") {
      return jsonError("REQUEST_VALIDATION_ERROR", {
        message: "priceId is required",
      })
    }

    const baseUrl = getAppBaseUrl()

    const sessionConfig: any = {
      mode: mode === "subscription" ? "subscription" : "payment",
      line_items: [
        {
          price: priceId,
          quantity: Number.isFinite(quantity) ? quantity : 1,
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

    logger.info("stripe_checkout_session_created", {
      eventName: "checkout.session.created",
      priceId,
      mode: sessionConfig.mode,
      stripeSessionId: session.id,
    })

    return Response.json({ id: session.id, url: session.url })
  } catch (error) {
    logger.error("stripe_checkout_session_failed", {
      reason: error instanceof Error ? error.message : "unknown",
    })
    incrementOperationalMetric("payment_failures_total", {
      source: "stripe_checkout_route",
      provider: "stripe",
    })

    return jsonErrorFromUnknown(error, "UPSTREAM_SERVICE_ERROR")
  }
}

