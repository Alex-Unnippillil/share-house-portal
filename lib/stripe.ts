import Stripe from 'stripe';

const STRIPE_API_VERSION: Stripe.LatestApiVersion = '2024-06-20';

let stripeClient: Stripe | null = null;

const missingVarMessage = (name: string) =>
  `Missing required Stripe environment variable: ${name}`;

export const getStripeWebhookSecret = (): string => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(missingVarMessage('STRIPE_WEBHOOK_SECRET'));
  }
  return secret;
};

export const getStripeRecurringPriceId = (): string | null =>
  process.env.STRIPE_RECURRING_PRICE_ID ?? null;

export const getStripePublishableKey = (): string | null =>
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null;

export const getStripeClient = (): Stripe => {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error(missingVarMessage('STRIPE_SECRET_KEY'));
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secret, {
      apiVersion: STRIPE_API_VERSION,
      typescript: true,
    });
  }

  return stripeClient;
};

export type StripeCheckoutMetadata = {
  invoiceId: string;
  tenantId: string;
};

export type StripeEventType =
  | 'checkout.session.completed'
  | 'invoice.payment_succeeded'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'charge.succeeded';

export const SUPPORTED_STRIPE_EVENTS: StripeEventType[] = [
  'checkout.session.completed',
  'invoice.payment_succeeded',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'charge.succeeded',
];
