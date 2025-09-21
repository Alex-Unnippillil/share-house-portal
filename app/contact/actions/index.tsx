'use server'

import { Resend } from 'resend'

export type ContactFormData = {
  name: string
  email: string
  message: string
}

export async function updateInqueries(data: ContactFormData) {
  const resendApiKey = process.env.RESEND_API_KEY

  if (!resendApiKey) {
    throw new Error('Resend API key is not configured.')
  }

  const resend = new Resend(resendApiKey)

  await resend.emails.send({
    from: 'Portal <support@example.com>',
    to: ['support@example.com'],
    subject: `Contact request from ${data.name}`,
    text: `${data.message}\n\nReply to: ${data.email}`,
  })

  return JSON.stringify({ ok: true })
}
