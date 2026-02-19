import { NextRequest } from "next/server"

import { requireApiAuth } from "@/lib/api-auth"
import { jsonError, jsonErrorFromUnknown } from "@/lib/errors"
import { getAppBaseUrl, getStripe } from "@/lib/stripe"

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe()
    const payload = await req.json().catch(() => ({}))
    const requestedCustomerId =
      typeof payload?.customerId === "string" ? payload.customerId : undefined

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
      throw profileError
    }

    const profileCustomerId = profile?.stripe_customer_id ?? undefined

    if (
      requestedCustomerId &&
      profileCustomerId &&
      requestedCustomerId !== profileCustomerId
    ) {
      return jsonError("AUTH_UNAUTHORIZED", {
        message: "You can only open the Billing Portal for your own account.",
      })
    }

    let customerId = profileCustomerId

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
