"use client"

import React, { useState } from "react"

import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type CheckoutSessionParams = {
  priceId: string
  planId: string
  planName: string
  quantity?: number
}

export type CheckoutSessionResponse = {
  id?: string
  url?: string
}

export async function createCheckoutSession(
  { priceId, planId, planName, quantity = 1 }: CheckoutSessionParams,
  fetchImpl: typeof fetch = fetch
): Promise<CheckoutSessionResponse> {
  if (!priceId) {
    throw new Error("A Stripe price ID is required to start checkout.")
  }

  const response = await fetchImpl("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      priceId,
      quantity,
      mode: "subscription",
      metadata: {
        plan_id: planId,
        plan_name: planName,
      },
    }),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : "Unable to create Stripe checkout session."
    throw new Error(message)
  }

  return payload as CheckoutSessionResponse
}

export interface UpgradeButtonProps
  extends Omit<ButtonProps, "onClick">,
    CheckoutSessionParams {}

export function UpgradeButton({
  priceId,
  planId,
  planName,
  quantity = 1,
  children,
  className,
  ...buttonProps
}: UpgradeButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setError(null)
    setIsLoading(true)

    try {
      const session = await createCheckoutSession(
        { priceId, planId, planName, quantity },
        fetch
      )

      if (!session?.url) {
        throw new Error("Stripe did not return a checkout URL.")
      }

      window.location.assign(session.url)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to start Stripe checkout. Please try again."
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={handleClick}
        isLoading={isLoading}
        className={cn("w-full", className)}
        {...buttonProps}
      >
        {children ?? `Upgrade to ${planName}`}
      </Button>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
