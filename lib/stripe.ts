import Stripe from "stripe";

let stripeClient: Stripe | null = null;

function getStripeSecretKey(): string {
  const secretKey =
    process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_API_KEY ?? null;

  if (!secretKey) {
    throw new Error(
      "Stripe secret key is not configured. Please set STRIPE_SECRET_KEY in your environment."
    );
  }

  return secretKey;
}

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(getStripeSecretKey(), {
      apiVersion: "2024-06-20",
    });
  }

  return stripeClient;
}

export type StripeClient = ReturnType<typeof getStripeClient>;
