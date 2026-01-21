"use client"

import { useRef, useState } from "react"
import type { Stripe } from "@stripe/stripe-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function StripeActions() {
  const [priceId, setPriceId] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [tenantId, setTenantId] = useState("")
  const [unitId, setUnitId] = useState("")
  const [loadingCheckout, setLoadingCheckout] = useState(false)
  const [loadingPortal, setLoadingPortal] = useState(false)
  const [loadingStripeSdk, setLoadingStripeSdk] = useState(false)
  const [checkoutLatency, setCheckoutLatency] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const stripePromiseRef = useRef<Promise<Stripe | null> | null>(null)

  const ensureStripe = async (): Promise<Stripe | null> => {
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      console.error("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY; unable to load Stripe.js.")
      setError(
        "Stripe.js is not configured. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to continue.",
      )
      return null
    }

    if (!stripePromiseRef.current) {
      setLoadingStripeSdk(true)
      stripePromiseRef.current = import("@stripe/stripe-js")
        .then(({ loadStripe }) => loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!))
        .catch((loadError) => {
          console.error("Failed to load Stripe.js", loadError)
          return null
        })
        .finally(() => {
          setLoadingStripeSdk(false)
        })
    }

    const stripe = await stripePromiseRef.current
    if (!stripe) {
      stripePromiseRef.current = null
      setError("Stripe.js failed to initialize. Please retry in a moment.")
    }
    return stripe
  }

  const startCheckout = async () => {
    if (!priceId || loadingCheckout || loadingStripeSdk) return
    setError(null)
    setCheckoutLatency(null)
    setLoadingCheckout(true)
    try {
      const start = performance.now()
      const stripePromise = ensureStripe()
      const checkoutResponse = fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          quantity: 1,
          mode: "payment",
          metadata: {
            tenant_id: tenantId || undefined,
            unit_id: unitId || undefined,
          },
        }),
      })

      const [stripe, res] = await Promise.all([stripePromise, checkoutResponse])
      if (!stripe) {
        return
      }

      const data = await res.json()
      if (!res.ok) {
        const message = data?.error || "Unable to create session"
        setError(message)
        return
      }

      const readiness = Math.round(performance.now() - start)
      setCheckoutLatency(readiness)
      console.log(`[payments] Stripe Checkout ready in ${readiness}ms`)

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.id,
      })
      if (stripeError) {
        console.error(stripeError)
        setError(stripeError.message ?? "Stripe Checkout failed to open.")
      }
    } catch (e) {
      console.error(e)
      setError(
        e instanceof Error ? e.message : "Unexpected error preparing Stripe Checkout.",
      )
    } finally {
      setLoadingCheckout(false)
    }
  }

  const openBillingPortal = async () => {
    if (!customerId) return
    setError(null)
    setLoadingPortal(true)
    try {
      const res = await fetch("/api/stripe/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      })
      const data = await res.json()
      if (!res.ok) {
        const message = data?.error || "Unable to create billing portal session"
        setError(message)
        throw new Error(message)
      }
      if (data?.url) window.location.assign(data.url)
    } catch (e) {
      console.error(e)
      if (e instanceof Error) {
        setError(e.message)
      }
    } finally {
      setLoadingPortal(false)
    }
  }

  return (
    <div className="space-y-4" aria-busy={loadingStripeSdk}>
      {loadingStripeSdk ? (
        <div
          className="space-y-3 rounded-lg border bg-muted/40 p-4"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm font-medium text-muted-foreground">
            Preparing secure Stripe Checkout…
          </p>
          <div className="space-y-2">
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
            <div className="h-10 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ) : null}
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tenant-id">Tenant ID (optional)</Label>
            <Input
              id="tenant-id"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="user-uuid"
              disabled={loadingCheckout || loadingStripeSdk}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit-id">Unit ID (optional)</Label>
            <Input
              id="unit-id"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              placeholder="unit-123"
              disabled={loadingCheckout || loadingStripeSdk}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={priceId}
            onChange={(e) => setPriceId(e.target.value)}
            placeholder="price_123 (test price id)"
            className="min-w-56 flex-1"
            disabled={loadingCheckout || loadingStripeSdk}
          />
          <Button
            onClick={startCheckout}
            disabled={!priceId || loadingCheckout || loadingStripeSdk}
            variant="outline"
          >
            {loadingStripeSdk ? "Loading Stripe..." : loadingCheckout ? "Creating..." : "Create Checkout"}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="cus_123 (Stripe customer id)"
            className="min-w-56 flex-1"
            disabled={loadingPortal}
          />
          <Button onClick={openBillingPortal} disabled={!customerId || loadingPortal} variant="outline">
            {loadingPortal ? "Opening..." : "Open Billing Portal"}
          </Button>
        </div>
      </div>
      {checkoutLatency !== null ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Checkout prepared in {checkoutLatency}ms (target &lt;500&nbsp;ms).
        </p>
      ) : null}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}


