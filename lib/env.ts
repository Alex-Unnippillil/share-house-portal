import { z } from "zod";

const requiredEnvDescriptions = {
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required so the client can initialise Stripe.js.",
  STRIPE_SECRET_KEY: "STRIPE_SECRET_KEY is required for server-side Stripe API access.",
  STRIPE_WEBHOOK_SECRET: "STRIPE_WEBHOOK_SECRET is required to verify Stripe webhook signatures.",
  SUPABASE_SERVICE_ROLE_KEY:
    "SUPABASE_SERVICE_ROLE_KEY is required for server-side mutations triggered by Stripe webhooks.",
} as const satisfies Record<string, string>;

const optionalEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  STRIPE_BILLING_PORTAL_RETURN_URL: z.string().url().optional(),
});

type RequiredEnvKey = keyof typeof requiredEnvDescriptions;

type OptionalEnv = z.infer<typeof optionalEnvSchema>;

const cachedOptionalEnv: OptionalEnv = optionalEnvSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  STRIPE_BILLING_PORTAL_RETURN_URL: process.env.STRIPE_BILLING_PORTAL_RETURN_URL,
});

export function getRequiredEnv(name: RequiredEnvKey): string {
  const value = process.env[name];

  if (!value || value.length === 0) {
    throw new Error(requiredEnvDescriptions[name]);
  }

  return value;
}

export function getOptionalEnv<K extends keyof OptionalEnv>(name: K): OptionalEnv[K] {
  return cachedOptionalEnv[name];
}

export function getAppUrl(): string {
  return getOptionalEnv("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000";
}

export function getStripePublishableKey(): string {
  return getRequiredEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
}

export function getStripeSecretKey(): string {
  return getRequiredEnv("STRIPE_SECRET_KEY");
}

export function getStripeWebhookSecret(): string {
  return getRequiredEnv("STRIPE_WEBHOOK_SECRET");
}

export function getSupabaseServiceRoleKey(): string {
  return getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function getStripeBillingPortalReturnUrl(): string {
  return (
    getOptionalEnv("STRIPE_BILLING_PORTAL_RETURN_URL") ?? `${getAppUrl()}/dashboard/payments`
  );
}
