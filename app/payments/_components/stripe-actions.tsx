"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function StripeActions() {
  const [priceId, setPriceId] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [tenantId, setTenantId] = useState("")
  const [unitId, setUnitId] = useState("")
  const [mode, setMode] = useState<"payment" | "subscription">("payment")
  const [loadingCheckout, setLoadingCheckout] = useState(false)
  const [loadingPortal, setLoadingPortal] = useState(false)

  const startCheckout = async () => {
    if (!priceId) return
    setLoadingCheckout(true)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          quantity: 1,
          mode,
          customerId: customerId || undefined,
          tenantId: tenantId || undefined,
          unitId: unitId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Unable to create session")
      if (data?.url) window.location.assign(data.url)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingCheckout(false)
    }
  }

  const openBillingPortal = async () => {
    setLoadingPortal(true)
    try {
      const res = await fetch("/api/stripe/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customerId || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Unable to create billing portal session")
      if (data?.url) window.location.assign(data.url)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingPortal(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tenant-id">Tenant ID (optional)</Label>
            <Input
              id="tenant-id"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="user-uuid"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit-id">Unit ID (optional)</Label>
            <Input
              id="unit-id"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              placeholder="unit-123"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="checkout-mode">Checkout mode</Label>
          <select
            id="checkout-mode"
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={mode}
            onChange={(event) => setMode(event.target.value as "payment" | "subscription")}
          >
            <option value="payment">One-time payment</option>
            <option value="subscription">Recurring subscription</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={priceId}
            onChange={(e) => setPriceId(e.target.value)}
            placeholder="price_123 (Stripe Price ID)"
            className="min-w-56 flex-1"
          />
          <Button onClick={startCheckout} disabled={!priceId || loadingCheckout} variant="outline">
            {loadingCheckout
              ? "Creating..."
              : mode === "subscription"
                ? "Start recurring checkout"
                : "Create one-time checkout"}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="cus_123 (Stripe customer id, optional)"
            className="min-w-56 flex-1"
          />
          <Button onClick={openBillingPortal} disabled={loadingPortal} variant="outline">
            {loadingPortal ? "Opening..." : "Open Billing Portal"}
          </Button>
        </div>
      </div>
    </div>
  )
}
