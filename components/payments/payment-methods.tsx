import type { User } from "@supabase/supabase-js";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { InteracPaymentForm } from "./interac-payment-form";
import { StripeCheckoutButton } from "./stripe-checkout-button";
import { StripePortalButton } from "./stripe-portal-button";

type PaymentMethodsProps = {
  user: User;
};

function resolveStripeCustomerId(user: User) {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const appMetadata = user.app_metadata as Record<string, unknown> | undefined;

  const fromUser = metadata?.stripe_customer_id ?? metadata?.stripeCustomerId;
  const fromApp =
    appMetadata?.stripe_customer_id ?? appMetadata?.stripeCustomerId;

  return typeof fromUser === "string"
    ? fromUser
    : typeof fromApp === "string"
      ? fromApp
      : undefined;
}

const stripePriceId =
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID ??
  process.env.STRIPE_DEFAULT_PRICE_ID ??
  undefined;

const defaultAmountSetting = process.env.NEXT_PUBLIC_STRIPE_DEFAULT_AMOUNT;
const stripeAmountCents = defaultAmountSetting
  ? Number.isNaN(Number(defaultAmountSetting))
    ? undefined
    : Math.round(Number(defaultAmountSetting) * 100)
  : undefined;

const stripeMode =
  process.env.NEXT_PUBLIC_STRIPE_MODE === "subscription" ? "subscription" : "payment";
const stripeSuccessUrl = process.env.NEXT_PUBLIC_STRIPE_SUCCESS_URL;
const stripeCancelUrl = process.env.NEXT_PUBLIC_STRIPE_CANCEL_URL;
const stripeAllowPromotionCodes =
  process.env.NEXT_PUBLIC_STRIPE_ALLOW_PROMOTION_CODES === "true";
const stripeTaxRates = process.env.NEXT_PUBLIC_STRIPE_TAX_RATES
  ? process.env.NEXT_PUBLIC_STRIPE_TAX_RATES.split(",")
      .map((rate) => rate.trim())
      .filter(Boolean)
  : undefined;

export function PaymentMethods({ user }: PaymentMethodsProps) {
  const stripeCustomerId = resolveStripeCustomerId(user);
  const stripeCustomerEmail = user.email ?? undefined;
  const stripeCheckoutConfigured = Boolean(stripePriceId || stripeAmountCents);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Pay with card</CardTitle>
          <CardDescription>
            Securely pay using Stripe. Your card details are never stored on our
            servers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Start a secure checkout session powered by Stripe to pay your rent,
            deposits, or invoices instantly.
          </p>
          <ul className="list-disc space-y-1 pl-4">
            <li>Supports Visa, Mastercard, American Express, and more.</li>
            <li>
              Receipts are automatically sent to {stripeCustomerEmail ?? "your email"}.
            </li>
            <li>Manage recurring subscriptions in the billing portal.</li>
          </ul>
          {!stripeCheckoutConfigured && (
            <div className="rounded-md border border-dashed border-destructive/60 bg-destructive/5 p-3 text-destructive">
              Configure STRIPE_DEFAULT_PRICE_ID or NEXT_PUBLIC_STRIPE_DEFAULT_AMOUNT
              in your environment to enable Stripe checkout.
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <StripeCheckoutButton
            priceId={stripePriceId}
            amount={stripeAmountCents}
            currency="cad"
            mode={stripeMode}
            successUrl={stripeSuccessUrl}
            cancelUrl={stripeCancelUrl}
            allowPromotionCodes={stripeAllowPromotionCodes}
            metadata={{ userId: user.id }}
            customerEmail={stripeCustomerEmail}
            customerId={stripeCustomerId}
            taxRates={stripeTaxRates}
            disabled={!stripeCheckoutConfigured}
            className="w-full sm:w-auto"
            label={
              stripeMode === "subscription"
                ? "Start subscription"
                : "Pay with Stripe"
            }
          />
          <StripePortalButton
            customerId={stripeCustomerId}
            customerEmail={stripeCustomerEmail}
            disabled={!stripeCustomerEmail}
            className="w-full sm:w-auto"
          />
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log an Interac e-Transfer</CardTitle>
          <CardDescription>
            Submit the details of your transfer so our finance team can match it
            quickly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InteracPaymentForm
            userId={user.id}
            defaultEmail={stripeCustomerEmail}
          />
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          <p>
            Need help? Reply to your confirmation email after sending the
            transfer and we will assist.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
