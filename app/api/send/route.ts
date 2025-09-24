import { EmailTemplate } from "@/components/email-template";
import { Resend } from 'resend';

import { timeExternal, withServerTiming } from '@/lib/server-timing';

async function sendEmail() {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    return Response.json({ error: "Resend API key is not configured." }, { status: 500 });
  }

  const resend = new Resend(resendApiKey);

  try {
    const { data, error } = await timeExternal('resend.emails.send', () =>
      resend.emails.send({
        from: 'Acme <onboarding@resend.dev>',
        to: ['delivered@resend.dev'],
        subject: 'Hello world',
        react: EmailTemplate({ firstName: 'John' }),
      }),
    )

    if (error) {
      // Type guard to ensure 'error' is an Error object
      if (error instanceof Error) {
        return Response.json({ error: error.message }, { status: 500 });
      } else {
        // Handle cases where 'error' is not an Error object (e.g., a string or object)
        return Response.json({ error: String(error) }, { status: 500 });
      }
    }

    return Response.json(data);
  } catch (error) {
    // Type guard for the catch block 'error' as well.
    if (error instanceof Error) {
      return Response.json({ error: error.message }, { status: 500 });
    } else {
      return Response.json({ error: String(error) }, { status: 500 });
    }
  }
}

export const POST = withServerTiming(sendEmail, 'api.send')
