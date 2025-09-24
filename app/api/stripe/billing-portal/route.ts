import { NextRequest } from "next/server"

import { getStripe, getAppBaseUrl } from "@/lib/stripe"
import { createClient } from "@/utils/supabase/server"

export async function POST(_req: NextRequest) {
  try {
    const stripe = getStripe()
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle()

    if (error) {
      console.error("Unable to load Stripe customer for billing portal", error)
      return Response.json({ error: "Unable to load billing profile" }, { status: 500 })
    }

    const customerId = data?.stripe_customer_id
    if (!customerId) {
      return Response.json({ error: "No Stripe customer on file" }, { status: 404 })
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


