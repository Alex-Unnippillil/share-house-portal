import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripeClient() {
  if (stripe) {
    return stripe;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set.");
  }

  stripe = new Stripe(secretKey, {
    apiVersion: "2024-06-20",
    typescript: true,
    appInfo: {
      name: "Share House Portal",
    },
  });

  return stripe;
}
