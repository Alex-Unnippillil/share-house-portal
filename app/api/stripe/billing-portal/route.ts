import { jsonError, jsonErrorFromUnknown } from "@/lib/errors"
import { getAppBaseUrl, getStripe } from "@/lib/stripe"
import { parseRequestJson } from "@/lib/validation"
import { billingPortalPayloadSchema } from "@/lib/validation/stripe"

export async function POST(request: Request) {
  const validationResult = await parseRequestJson(
    request,
    billingPortalPayloadSchema,
    { validationErrorMessage: "Invalid billing portal payload." }
  )

  if (!validationResult.success) {
    return validationResult.error
  }

  const { customerId } = validationResult.data

  try {
    const stripe = getStripe()
    const returnUrl = getAppBaseUrl() + "/payments"
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return Response.json({ url: session.url })
  } catch (error) {
    if (error instanceof Error && error.message.includes("Stripe is not configured")) {
      return jsonError("CONFIGURATION_ERROR", { message: error.message })
    }

    return jsonErrorFromUnknown(error, "UPSTREAM_SERVICE_ERROR")
  }
}
