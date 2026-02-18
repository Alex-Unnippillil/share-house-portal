import { jsonError, jsonErrorFromUnknown } from "@/lib/errors"
import { createPlaidLinkToken } from "@/lib/plaid"
import { createClient } from "@/utils/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return jsonError("AUTH_UNAUTHORIZED")
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single()

    const token = await createPlaidLinkToken({
      userId: user.id,
      email: profile?.email ?? user.email,
      legalName: profile?.full_name ?? undefined,
    })

    return Response.json({
      linkToken: token.link_token,
      expiresAt: token.expiration,
      consent: {
        bankLinking:
          "By linking your bank account, you authorize Share House Portal to retrieve tokenized account metadata from Plaid and send a processor token to Stripe for ACH rent payments.",
        autopay:
          "By enabling autopay, you authorize recurring ACH debits for your rent share according to your lease schedule. ACH debits may remain pending for up to 5 business days.",
      },
    })
  } catch (error) {
    return jsonErrorFromUnknown(error, "UPSTREAM_SERVICE_ERROR")
  }
}
