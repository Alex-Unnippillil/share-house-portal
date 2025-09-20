"use client";

import { useState } from "react";

import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Loader2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

let stripePromise: Promise<Stripe | null> | null = null;

function getStripeJs() {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (!publishableKey) {
      return null;
    }

    stripePromise = loadStripe(publishableKey);
  }

  return stripePromise;
}

type StripeCheckoutButtonProps = {
  priceId?: string;
  amount?: number;
  currency?: string;
  mode?: "payment" | "subscription";
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
  customerEmail?: string;
  customerId?: string;
  quantity?: number;
  allowPromotionCodes?: boolean;
  label?: string;
  description?: string;
  trialPeriodDays?: number;
  taxRates?: string[];
} & ButtonProps;

export function StripeCheckoutButton({
  priceId,
  amount,
  currency,
  mode = "payment",
  successUrl,
  cancelUrl,
  metadata,
  customerEmail,
  customerId,
  quantity,
  allowPromotionCodes,
  label = "Checkout with card",
  description,
  trialPeriodDays,
  taxRates,
  className,
  disabled: disabledProp,
  ...buttonProps
}: StripeCheckoutButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isButtonDisabled = Boolean(disabledProp) || isSubmitting;

  const handleCheckout = async () => {
    const stripeLoader = getStripeJs();

    if (!stripeLoader) {
      toast({
        title: "Stripe is not configured",
        description:
          "Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to enable card payments.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/payments/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          amount,
          currency,
          mode,
          successUrl,
          cancelUrl,
          metadata,
          customerEmail,
          customerId,
          quantity,
          allowPromotionCodes,
          productName: label,
          productDescription: description,
          trialPeriodDays,
          taxRates,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.message ?? "Unable to start checkout.");
      }

      const data = (await response.json()) as {
        id?: string;
        url?: string | null;
        clientSecret?: string | null;
      };

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      const stripe = await stripeLoader;

      if (!stripe) {
        throw new Error("Stripe.js failed to load");
      }

      if (data?.id) {
        const { error } = await stripe.redirectToCheckout({
          sessionId: data.id,
        });

        if (error) {
          throw error;
        }
      } else {
        throw new Error("Missing Stripe session identifier.");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";
      toast({
        title: "Unable to start Stripe checkout",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleCheckout}
      disabled={isButtonDisabled}
      className={cn("gap-2", className)}
      {...buttonProps}
    >
      {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </Button>
  );
}
