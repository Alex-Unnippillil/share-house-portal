import { NextResponse } from 'next/server'

export type CreateStripeCheckoutPayload = {
  amount: number
  currency?: string
  invoiceIds: string[]
  leaseId: string
  successUrl?: string
  cancelUrl?: string
}

export type StripeCheckoutSession = {
  sessionId: string
  url: string
}

export async function createStripeCheckoutSession(
  payload: CreateStripeCheckoutPayload,
): Promise<StripeCheckoutSession> {
  const { amount, currency = 'usd', invoiceIds, leaseId, successUrl, cancelUrl } = payload

  if (!amount || amount <= 0) {
    throw new Error('A positive amount is required to start a checkout session.')
  }

  if (!invoiceIds.length) {
    throw new Error('At least one invoice must be included in the payment session.')
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const sessionId = `sess_${crypto.randomUUID()}`

  const success = successUrl ?? `${baseUrl}/rent?session_id=${encodeURIComponent(sessionId)}`
  const cancel = cancelUrl ?? `${baseUrl}/rent`

  // In production this is where Stripe's SDK would be invoked. The helper returns
  // deterministic data so that the rest of the app can continue to develop offline.
  return {
    sessionId,
    url: `${success}#amount=${amount}&currency=${currency}&lease=${leaseId}&cancel=${encodeURIComponent(cancel)}`,
  }
}

export async function POST(request: Request) {
  const payload = (await request.json()) as CreateStripeCheckoutPayload
  const session = await createStripeCheckoutSession(payload)

  return NextResponse.json(session)
}
