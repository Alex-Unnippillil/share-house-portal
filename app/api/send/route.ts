import { Resend } from 'resend'

import { EmailTemplate } from '@/components/email-template'
import { createCompressedJsonResponse } from '@/lib/http/compression'

export async function POST(request: Request) {
  const resendApiKey = process.env.RESEND_API_KEY

  if (!resendApiKey) {
    return createCompressedJsonResponse(
      request,
      { error: 'Resend API key is not configured.' },
      { status: 500 }
    )
  }

  const resend = new Resend(resendApiKey)

  try {
    const { data, error } = await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: ['delivered@resend.dev'],
      subject: 'Hello world',
      react: EmailTemplate({ firstName: 'John' }),
    });

    if (error) {
      // Type guard to ensure 'error' is an Error object
      if (error instanceof Error) {
        return createCompressedJsonResponse(
          request,
          { error: error.message },
          { status: 500 }
        )
      } else {
        // Handle cases where 'error' is not an Error object (e.g., a string or object)
        return createCompressedJsonResponse(
          request,
          { error: String(error) },
          { status: 500 }
        )
      }
    }

    return createCompressedJsonResponse(request, data)
  } catch (error) {
    // Type guard for the catch block 'error' as well.
    if (error instanceof Error) {
      return createCompressedJsonResponse(
        request,
        { error: error.message },
        { status: 500 }
      )
    } else {
      return createCompressedJsonResponse(
        request,
        { error: String(error) },
        { status: 500 }
      )
    }
  }
}
