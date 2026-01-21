import { cookies } from "next/headers"
import { NextRequest } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"

import { jsonError, jsonErrorFromUnknown } from "@/lib/errors"
import { getAppBaseUrl, getStripe } from "@/lib/stripe"
import type { Database } from "@/lib/supabase"
import { createClient } from "@/utils/supa-server-actions"

export async function POST(req: NextRequest) {
  try {
    const { customerId } = await req.json()
    if (!customerId || typeof customerId !== "string") {
      return jsonError("REQUEST_VALIDATION_ERROR", {
        message: "customerId is required",
      })
    }

    const cookieStore = cookies()
    const supabase = createClient(cookieStore) as SupabaseClient<Database>

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return jsonError("AUTH_UNAUTHORIZED")
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, unit_id, stripe_customer_id")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      console.error("Unable to load profile for authenticated user", {
        userId: user.id,
        error: profileError?.message ?? "not_found",
      })
      return jsonError("AUTH_UNAUTHORIZED")
    }

    const { data: ownerProfile, error: ownerError } = await supabase
      .from("profiles")
      .select("id, unit_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle()

    if (ownerError) {
      console.error("Failed to verify Stripe customer ownership", {
        userId: user.id,
        customerId,
        error: ownerError.message,
      })
      return jsonError("DATA_FETCH_FAILED", {
        message: "Unable to verify Stripe customer ownership",
      })
    }

    const belongsToUser = ownerProfile?.id === profile.id
    const belongsToUnit =
      Boolean(ownerProfile?.unit_id) &&
      Boolean(profile.unit_id) &&
      ownerProfile?.unit_id === profile.unit_id

    if (!belongsToUser && !belongsToUnit) {
      console.warn("Stripe billing portal access forbidden", {
        reason: ownerProfile ? "customer_not_in_unit" : "customer_not_found",
        userId: user.id,
        userUnitId: profile.unit_id,
        attemptedCustomerId: customerId,
        ownerProfileId: ownerProfile?.id ?? null,
        ownerUnitId: ownerProfile?.unit_id ?? null,
      })
      return jsonError("AUTH_FORBIDDEN")
    }

    const stripe = getStripe()
    const returnUrl = getAppBaseUrl() + "/payments"
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })
    return Response.json({ url: session.url })
  } catch (error) {
    return jsonErrorFromUnknown(error, "UPSTREAM_SERVICE_ERROR")
  }
}


