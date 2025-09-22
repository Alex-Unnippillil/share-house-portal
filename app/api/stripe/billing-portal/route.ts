import { NextRequest } from "next/server"
import { getStripe, getAppBaseUrl } from "@/lib/stripe"

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe()
    const { customerId } = await req.json()
    if (!customerId || typeof customerId !== "string") {
      return Response.json({ error: "customerId is required" }, { status: 400 })
    }
    const returnUrl = getAppBaseUrl() + "/payments"
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })
    return Response.json({ url: session.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return Response.json({ error: message }, { status: 500 })
  }
}


