import { Resend } from "resend"

import { EmailTemplate } from "@/components/email-template"
import { jsonError, jsonErrorFromUnknown } from "@/lib/errors"

export async function POST() {
  const resendApiKey = process.env.RESEND_API_KEY

  if (!resendApiKey) {
    return jsonError("CONFIGURATION_ERROR", {
      message: "Resend API key is not configured.",
    })
  }

  const resend = new Resend(resendApiKey)

  try {
    const { data, error } = await resend.emails.send({
      from: "Acme <onboarding@resend.dev>",
      to: ["delivered@resend.dev"],
      subject: "Hello world",
      react: EmailTemplate({ firstName: "John" }),
    })

    if (error) {
      const message = error instanceof Error ? error.message : String(error)
      return jsonError("UPSTREAM_SERVICE_ERROR", {
        message,
        details: { provider: "resend" },
      })
    }

    return Response.json(data)
  } catch (error) {
    return jsonErrorFromUnknown(error, "UPSTREAM_SERVICE_ERROR")
  }
}
