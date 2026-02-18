import { jsonError, jsonErrorFromUnknown } from "@/lib/errors"
import { exchangePublicToken } from "@/lib/plaid"
import { getStripe } from "@/lib/stripe"
import { createClient } from "@/utils/supabase/server"

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return jsonError("AUTH_UNAUTHORIZED")
    }

    const body = await req.json()
    const publicToken = body?.publicToken

    if (!publicToken || typeof publicToken !== "string") {
      return jsonError("REQUEST_VALIDATION_ERROR", {
        message: "publicToken is required.",
      })
    }

    const stripe = getStripe()

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, metadata")
      .eq("id", user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return jsonError("REQUEST_VALIDATION_ERROR", {
        message: "Stripe customer is not configured for this tenant.",
      })
    }

    const exchange = await exchangePublicToken({
      publicToken,
    })

    const linkedAccounts: Array<Record<string, string | null>> = []

    for (const account of exchange.tokenizedAccounts) {
      const source = await stripe.customers.createSource(profile.stripe_customer_id, {
        source: account.stripeBankAccountToken,
      })

      const sourceId = typeof source === "string" ? source : source.id

      linkedAccounts.push({
        stripeSourceId: sourceId,
        plaidAccountId: account.plaidAccountId,
        mask: account.mask,
        name: account.name,
        subtype: account.subtype,
        type: account.type,
      })
    }

    const currentMetadata =
      profile.metadata && typeof profile.metadata === "object"
        ? (profile.metadata as Record<string, unknown>)
        : {}

    const paymentMetadata =
      currentMetadata.payment_methods &&
      typeof currentMetadata.payment_methods === "object"
        ? (currentMetadata.payment_methods as Record<string, unknown>)
        : {}

    const achAccounts =
      paymentMetadata.ach_accounts && Array.isArray(paymentMetadata.ach_accounts)
        ? paymentMetadata.ach_accounts
        : []

    const nextMetadata = {
      ...currentMetadata,
      payment_methods: {
        ...paymentMetadata,
        ach_accounts: [
          ...achAccounts,
          ...linkedAccounts.map((account) => ({
            ...account,
            linkedAt: new Date().toISOString(),
          })),
        ],
      },
    }

    await supabase.from("profiles").update({ metadata: nextMetadata }).eq("id", user.id)

    return Response.json({
      linkedAccounts,
      achSettlement: {
        pendingMessage:
          "ACH debits typically settle in 3–5 business days. Your payment may appear as pending during this window.",
        failedMessage:
          "If ACH settlement fails (for example NSF or account closed), autopay will pause and you will be prompted to add another bank account or pay manually.",
      },
    })
  } catch (error) {
    return jsonErrorFromUnknown(error, "UPSTREAM_SERVICE_ERROR")
  }
}
