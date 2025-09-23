"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/payments/currency"
import {
  buildCheckoutSessionPayload,
  type TenantBillingContext,
} from "@/lib/payments/billing"

interface StripeActionsProps {
  billingContext: TenantBillingContext | null
}

export function StripeActions({ billingContext }: StripeActionsProps) {
  const [loadingCheckout, setLoadingCheckout] = useState(false)
  const [loadingPortal, setLoadingPortal] = useState(false)

  const plan = billingContext?.plan ?? null
  const tenantId = billingContext?.tenantId ?? null
  const unitId = billingContext?.unitId ?? null
  const stripeCustomerId = billingContext?.stripeCustomerId ?? null

  const checkoutLabel = plan
    ? `Start ${formatCurrency(plan.amount, plan.currency)} checkout`
    : "Select a plan to checkout"

  const startCheckout = async () => {
    if (!plan) return
    setLoadingCheckout(true)
    try {
      const payload = buildCheckoutSessionPayload({
        plan,
        tenantId,
        unitId,
        stripeCustomerId,
      })

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Unable to create session")
      if (data?.url) window.location.assign(data.url)
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingCheckout(false)
    }
  }

  const openBillingPortal = async () => {
    if (!stripeCustomerId) return
    setLoadingPortal(true)
    try {
      const res = await fetch("/api/stripe/billing-portal", {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok)
        throw new Error(data?.error || "Unable to create billing portal session")
      if (data?.url) window.location.assign(data.url)
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingPortal(false)
    }
  }

  const checkoutDisabled = !plan || loadingCheckout
  const portalDisabled = !stripeCustomerId || loadingPortal

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border bg-muted/40 p-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">Plan details</p>
          {plan ? (
            <>
              <p className="text-sm text-foreground">{plan.label}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(plan.amount, plan.currency)} per {plan.interval}
              </p>
              <p className="text-xs text-muted-foreground">{plan.description}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Assign a Roomsily billing plan in account settings to enable Stripe checkout.
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          onClick={startCheckout}
          disabled={checkoutDisabled}
          className="sm:flex-1"
        >
          {loadingCheckout ? "Redirecting..." : checkoutLabel}
        </Button>
        <Button
          onClick={openBillingPortal}
          disabled={portalDisabled}
          variant="outline"
          className="sm:flex-1"
        >
          {loadingPortal ? "Opening..." : "Open Billing Portal"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Checkout sessions are prefilled with your tenant and unit metadata for reconciliation.
      </p>
      {!stripeCustomerId ? (
        <p className="text-xs text-muted-foreground">
          Add a payment method through Stripe to unlock billing portal downloads.
        </p>
      ) : null}
    </div>
  )
}
