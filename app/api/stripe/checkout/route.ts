import { NextRequest } from "next/server"

import { jsonError, jsonErrorFromUnknown } from "@/lib/errors"
import { createStructuredLogger } from "@/lib/observability/logger"
import { incrementOperationalMetric } from "@/lib/observability/metrics"
import { providerOutageMessage } from "@/lib/resilience"
import { getAppBaseUrl, getStripe } from "@/lib/stripe"

const allowedPaymentModes = new Set(["payment", "subscription"])

function normalizeMode(mode: unknown): "payment" | "subscription" {
  if (typeof mode === "string" && allowedPaymentModes.has(mode)) {
    return mode as "payment" | "subscription"
  }

  return "payment"
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID()
  const logger = createStructuredLogger("route_handler", {
    component: "stripe_checkout_route",
    requestId,
  })

  try {
    const stripe = getStripe()
    const {
      priceId,
      quantity = 1,
      mode,
      metadata,
      customerId,
      tenantId,
      unitId,
    } = await req.json()

    if (!priceId || typeof priceId !== "string") {
      return jsonError("REQUEST_VALIDATION_ERROR", {
        message: "priceId is required",
      })
    }

    const normalizedMode = normalizeMode(mode)
    const baseUrl = getAppBaseUrl()
    const safeQuantity =
      Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1

    const safeMetadata = {
      ...(metadata && typeof metadata === "object" ? metadata : {}),
      ...(typeof tenantId === "string" ? { tenant_id: tenantId } : {}),
      ...(typeof unitId === "string" ? { unit_id: unitId } : {}),
      payment_mode: normalizedMode,
    }

    const sessionConfig = {
      mode: normalizedMode,
      line_items: [
        {
          price: priceId,
          quantity: safeQuantity,
        },
      ],
      customer:
        typeof customerId === "string" && customerId.length
          ? customerId
          : undefined,
      success_url: `${baseUrl}/payments?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payments?status=cancelled`,
      metadata: safeMetadata,
      payment_intent_data:
        normalizedMode === "payment"
          ? {
              metadata: safeMetadata,
            }
          : undefined,
      subscription_data:
        normalizedMode === "subscription"
          ? {
              metadata: safeMetadata,
            }
          : undefined,
      allow_promotion_codes: true,
    }

    const checkoutSession = await stripe.checkout.sessions.create(sessionConfig)

    logger.info("stripe_checkout_session_created", {
      eventName: "checkout.session.created",
      priceId,
      mode: normalizedMode,
      stripeSessionId: checkoutSession.id,
    })

    return Response.json({ id: checkoutSession.id, url: checkoutSession.url, mode: normalizedMode })
  } catch (error) {
    logger.error("stripe_checkout_session_failed", {
      reason: error instanceof Error ? error.message : "unknown",
    })
    incrementOperationalMetric("payment_failures_total", {
      source: "stripe_checkout_route",
      provider: "stripe",
    })

    return jsonErrorFromUnknown(
      new Error(providerOutageMessage("stripe")),
      "UPSTREAM_SERVICE_ERROR"
    )
  }
}
