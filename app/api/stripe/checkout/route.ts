import { NextRequest } from "next/server"

import { requireApiAuth } from "@/lib/api-auth"
import { jsonError, jsonErrorFromUnknown } from "@/lib/errors"
import { createStructuredLogger, getCorrelationId } from "@/lib/observability/logger"
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
  const correlationId = getCorrelationId(req.headers, requestId)
  const logger = createStructuredLogger("route_handler", {
    component: "stripe_checkout_route",
    requestId,
    correlationId,
  })

  logger.info("stripe_checkout_request_received", {
    lifecyclePhase: "request.received",
  })

  try {
    const stripe = getStripe()
    const authContext = await requireApiAuth()
    if (authContext instanceof Response) {
      return authContext
    }

    const { supabase, userId } = authContext
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .maybeSingle()

    if (profileError) {
      return jsonError("DATA_FETCH_FAILED", {
        message: "Unable to load Stripe customer details.",
        details: { reason: profileError.message },
      })
    }

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
      tenant_id: userId,
      ...(typeof unitId === "string" ? { unit_id: unitId } : {}),
      payment_mode: normalizedMode,
    }

    if (
      typeof customerId === "string" &&
      customerId.length > 0 &&
      customerId !== profile?.stripe_customer_id
    ) {
      return jsonError("AUTH_UNAUTHORIZED", {
        message: "The provided customerId does not belong to the authenticated user.",
      })
    }

    if (typeof tenantId === "string" && tenantId.length > 0 && tenantId !== userId) {
      return jsonError("AUTH_UNAUTHORIZED", {
        message: "The provided tenantId does not match the authenticated user.",
      })
    }

    const sessionConfig = {
      mode: normalizedMode,
      line_items: [
        {
          price: priceId,
          quantity: safeQuantity,
        },
      ],
      customer: profile?.stripe_customer_id ?? undefined,
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
      lifecyclePhase: "request.completed",
    })

    return Response.json(
      {
        id: checkoutSession.id,
        url: checkoutSession.url,
        mode: normalizedMode,
        correlationId,
      },
      { headers: { "x-correlation-id": correlationId } }
    )
  } catch (error) {
    logger.error("stripe_checkout_session_failed", {
      reason: error instanceof Error ? error.message : "unknown",
    })
    incrementOperationalMetric("payment_failures_total", {
      source: "stripe_checkout_route",
      provider: "stripe",
      correlationId,
      severity: "high",
    })

    return jsonErrorFromUnknown(
      new Error(providerOutageMessage("stripe")),
      "UPSTREAM_SERVICE_ERROR"
    )
  }
}
