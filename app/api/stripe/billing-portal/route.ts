import { createClient } from "@/utils/supabase/server"
import { NextRequest } from "next/server"

import { jsonError, jsonErrorFromUnknown } from "@/lib/errors"
import { getAppBaseUrl, getStripe } from "@/lib/stripe"

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe()
    const payload = await req.json().catch(() => ({}))
    const requestedCustomerId =
      typeof payload?.customerId === "string" ? payload.customerId : undefined

    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return jsonError("AUTH_UNAUTHORIZED", {
        message: "You must be authenticated to open Billing Portal.",
      })
    }

    let customerId = requestedCustomerId

    if (!customerId) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("stripe_customer_id")
        .eq("id", user.id)
        .maybeSingle()

      if (profileError) {
        throw profileError
      }

      customerId = profile?.stripe_customer_id ?? undefined
    }

    if (!customerId) {
      return jsonError("REQUEST_VALIDATION_ERROR", {
        message: "No Stripe customer ID was found for this account.",
      })
    }

    const returnUrl = `${getAppBaseUrl()}/payments`
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return Response.json({ url: session.url })
  } catch (error) {
    return jsonErrorFromUnknown(error, "UPSTREAM_SERVICE_ERROR")
  }
}
