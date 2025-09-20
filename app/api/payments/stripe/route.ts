import { NextResponse } from "next/server"

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "http://localhost:3000"

export type StripeCheckoutSessionInput = {
  amount: number
  currency: string
  customerEmail?: string
  metadata?: Record<string, string | number | boolean | null>
  successUrl?: string
  cancelUrl?: string
}

export type StripeCheckoutSession = {
  id: string
  url: string
  amount: number
  currency: string
}

function resolveUrl(fallbackPath: string, explicitUrl?: string) {
  if (explicitUrl) return explicitUrl
  const url = new URL(fallbackPath, SITE_URL)
  return url.toString()
}

export async function createStripeCheckoutSession(
  input: StripeCheckoutSessionInput,
): Promise<StripeCheckoutSession> {
  const normalizedAmount = Number(input.amount)

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error("A positive payment amount is required.")
  }

  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `mock_${Math.random().toString(36).slice(2)}`

  return {
    id,
    url: resolveUrl("/rent?payment=session", input.successUrl),
    amount: normalizedAmount,
    currency: input.currency,
  }
}

export async function POST(request: Request) {
  const payload = await request
    .json()
    .catch(() => ({}) as Partial<StripeCheckoutSessionInput>)

  try {
    const session = await createStripeCheckoutSession({
      amount: Number(payload.amount ?? 0),
      currency: typeof payload.currency === "string" ? payload.currency : "usd",
      customerEmail:
        typeof payload.customerEmail === "string" ? payload.customerEmail : undefined,
      metadata:
        payload.metadata && typeof payload.metadata === "object"
          ? (payload.metadata as Record<string, string | number | boolean | null>)
          : undefined,
      successUrl: typeof payload.successUrl === "string" ? payload.successUrl : undefined,
      cancelUrl: typeof payload.cancelUrl === "string" ? payload.cancelUrl : undefined,
    })

    return NextResponse.json(session)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create payment session."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
