import { EmailTemplate } from "@/components/email-template"
import { enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { Resend } from "resend"

export async function POST(request: Request) {
  const rateLimit = await enforceRateLimit(request, {
    limit: 5,
    window: 60,
    prefix: "send-email",
    metadata: {
      route: "app/api/send",
      type: "resend"
    }
  })

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit)
  }

  const resendApiKey = process.env.RESEND_API_KEY

  if (!resendApiKey) {
    return Response.json({ error: "Resend API key is not configured." }, { status: 500 })
  }

  const resend = new Resend(resendApiKey)

  try {
    const { data, error } = await resend.emails.send({
      from: "Acme <onboarding@resend.dev>",
      to: ["delivered@resend.dev"],
      subject: "Hello world",
      react: EmailTemplate({ firstName: "John" })
    })

    if (error) {
      if (error instanceof Error) {
        return Response.json({ error: error.message }, { status: 500 })
      }

      return Response.json({ error: String(error) }, { status: 500 })
    }

    return Response.json(data)
  } catch (error) {
    if (error instanceof Error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ error: String(error) }, { status: 500 })
  }
}
