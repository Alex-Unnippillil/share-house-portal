import { NextRequest } from "next/server"
import { getStripe, getAppBaseUrl } from "@/lib/stripe"

import { timeExternal, withServerTiming } from "@/lib/server-timing"

async function createCheckoutSession(req: NextRequest) {
  try {
    const stripe = getStripe()
    const { priceId, quantity = 1, mode = "payment", metadata } = await req.json()

    if (!priceId || typeof priceId !== "string") {
      return Response.json({ error: "priceId is required" }, { status: 400 })
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

    const session = await timeExternal(
      "stripe.checkout.sessions.create",
      () => stripe.checkout.sessions.create(sessionConfig)
    )

    return Response.json({ id: session.id, url: session.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    const status = message.includes("Stripe is not configured") ? 500 : 500
    return Response.json({ error: message }, { status })
  }
}

export const POST = withServerTiming(createCheckoutSession, "api.stripe.checkout")


