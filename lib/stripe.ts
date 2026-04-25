import Stripe from "stripe"

import { ConfigurationApiError, UpstreamServiceApiError } from "@/lib/errors"
import { resilientRequest } from "@/lib/resilience"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  // We intentionally do not throw at import-time to avoid crashing non-payment routes.
  // Endpoints using Stripe will validate this again and return a clear error.
}

export function getStripe(): Stripe {
  if (!stripeSecretKey) {
    throw new ConfigurationApiError("STRIPE_SECRET_KEY")
  }

  const apiVersion: Stripe.StripeConfig["apiVersion"] = "2024-06-20"
  return new Stripe(stripeSecretKey, { apiVersion })
}

export async function withStripeResilience<T>(
  operation: string,
  request: () => Promise<T>
): Promise<T> {
  try {
    const { value } = await resilientRequest(request, {
      provider: "stripe",
      operation,
      retries: 2,
      initialDelayMs: 250,
      jitter: true,
      timeoutMs: 6_000,
      circuitFailureThreshold: 4,
    })

    return value
  } catch (error) {
    throw new UpstreamServiceApiError("stripe", {
      operation,
      details: { originalMessage: error instanceof Error ? error.message : String(error) },
      cause: error,
    })
  }
}

export function getAppBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
  if (url) {
    return url.startsWith("http") ? url : `https://${url}`
  }
  return "http://localhost:3000"
}
