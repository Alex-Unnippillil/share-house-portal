import { NextRequest } from "next/server"
import { IntegrationTimeoutError, IntegrationUnavailableError } from "@/lib/errors"
import { executeWithStripe, getAppBaseUrl } from "@/lib/stripe"

export async function POST(req: NextRequest) {
  try {
    const { customerId } = await req.json()
    if (!customerId || typeof customerId !== "string") {
      return Response.json({ error: "customerId is required" }, { status: 400 })
    }
    const returnUrl = getAppBaseUrl() + "/payments"
    const session = await executeWithStripe(
      "billingPortal.sessions.create",
      stripe =>
        stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: returnUrl,
        }),
      {
        metadata: { customerId },
      }
    )
    return Response.json({ url: session.url })
  } catch (error) {
    if (error instanceof IntegrationUnavailableError) {
      return Response.json(
        {
          error: error.message,
          queued: error.queued,
          jobId: error.jobId,
        },
        { status: 503 }
      )
    }

    if (error instanceof IntegrationTimeoutError) {
      return Response.json({ error: error.message }, { status: 504 })
    }

    const message = error instanceof Error ? error.message : "Unexpected error"
    return Response.json({ error: message }, { status: 500 })
  }
}


