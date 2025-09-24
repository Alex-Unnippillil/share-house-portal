import Stripe from "stripe"

import {
  ResilienceExecuteOptions,
  ResilienceManager,
} from "@/lib/resilience"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  // We intentionally do not throw at import-time to avoid crashing non-payment routes.
  // Endpoints using Stripe will validate this again and return a clear error.
}

const stripeResilience = new ResilienceManager({
  serviceName: "stripe",
  timeoutMs: 7000,
  breakerThreshold: 3,
  halfOpenAfterMs: 15000,
  retryAttempts: 3,
  retryBackoffMs: 400,
  queueLimit: 50,
  maxQueueAttempts: 5,
})

let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeSecretKey) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.")
  }

  if (!stripeClient) {
    const apiVersion: Stripe.StripeConfig["apiVersion"] = "2024-06-20"
    stripeClient = new Stripe(stripeSecretKey, { apiVersion })
  }

  return stripeClient
}

export async function executeWithStripe<T>(
  operationName: string,
  executor: (stripe: Stripe) => Promise<T> | T,
  options: ResilienceExecuteOptions<T> = {}
): Promise<T> {
  const stripe = getStripe()
  return stripeResilience.execute(operationName, () => executor(stripe), {
    ...options,
    queueOnOpen: options.queueOnOpen ?? false,
  })
}

export function getAppBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
  if (url) {
    return url.startsWith("http") ? url : `https://${url}`
  }
  return "http://localhost:3000"
}

export { stripeResilience }


