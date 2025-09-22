import Stripe from "stripe"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  // We intentionally do not throw at import-time to avoid crashing non-payment routes.
  // Endpoints using Stripe will validate this again and return a clear error.
}

export function getStripe(): Stripe {
  if (!stripeSecretKey) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.")
  }

  const apiVersion: Stripe.StripeConfig["apiVersion"] = "2024-06-20"
  return new Stripe(stripeSecretKey, { apiVersion })
}

export function getAppBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
  if (url) {
    return url.startsWith("http") ? url : `https://${url}`
  }
  return "http://localhost:3000"
}


