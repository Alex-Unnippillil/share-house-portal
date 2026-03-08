import { NextResponse } from "next/server"

import {
  buildHealthResponse,
  checkCalCom,
  checkDocumenso,
  checkResend,
  checkStripeWebhook,
  checkSupabase,
} from "../checks"

export async function GET() {
  const [supabase, stripeWebhook, resend, documenso, calCom] = await Promise.all([
    checkSupabase(),
    checkStripeWebhook(),
    checkResend(),
    checkDocumenso(),
    checkCalCom(),
  ])

  const checks = {
    supabase,
    stripeWebhook,
    resend,
    documenso,
    calCom,
  }

  const response = buildHealthResponse(checks)
  const statusCode = response.status === "fail" ? 503 : 200

  return NextResponse.json(response, { status: statusCode })
}
