import Stripe from "stripe";

import { getStripeSecretKey } from "@/lib/env";

export const STRIPE_API_VERSION: Stripe.StripeConfig["apiVersion"] = "2024-06-20";

let stripeClient: Stripe | undefined;

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(getStripeSecretKey(), { apiVersion: STRIPE_API_VERSION });
  }

  return stripeClient;
}
