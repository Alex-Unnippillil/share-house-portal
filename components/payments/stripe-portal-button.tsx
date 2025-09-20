"use client";

import { useState } from "react";

import { Loader2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

interface StripePortalButtonProps extends ButtonProps {
  customerId?: string;
  customerEmail?: string;
  returnUrl?: string;
  label?: string;
}

export function StripePortalButton({
  customerId,
  customerEmail,
  returnUrl,
  label = "Manage billing",
  className,
  disabled: disabledProp,
  variant,
  ...buttonProps
}: StripePortalButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isButtonDisabled = Boolean(disabledProp) || isSubmitting;

  const handleOpenPortal = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/payments/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, customerEmail, returnUrl }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.message ?? "Unable to open billing portal.");
      }

      const data = (await response.json()) as { url?: string };

      if (!data?.url) {
        throw new Error("Stripe did not return a billing portal URL.");
      }

      window.location.href = data.url;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";
      toast({
        title: "Unable to open billing portal",
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
      onClick={handleOpenPortal}
      variant={variant ?? "outline"}
      disabled={isButtonDisabled}
      className={className}
      {...buttonProps}
    >
      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {label}
    </Button>
  );
}
