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
          mode: "payment",
          metadata: {
            tenant_id: tenantId || undefined,
            unit_id: unitId || undefined,
          }
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
    if (!customerId) return
    setLoadingPortal(true)
    try {
      const res = await fetch("/api/stripe/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
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
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold">Attach optional context</p>
        <p className="text-sm text-muted-foreground">
          Tag each session with tenant or unit identifiers so it&apos;s easy to reconcile test payments later.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tenant-id">
            Tenant ID <span className="text-xs font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="tenant-id"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            placeholder="e.g. tenant_123"
          />
          <p className="text-xs text-muted-foreground">
            Stored as <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">tenant_id</code> metadata in Stripe.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="unit-id">
            Unit ID <span className="text-xs font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="unit-id"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            placeholder="e.g. unit-a2"
          />
          <p className="text-xs text-muted-foreground">
            Helpful when a property has multiple roommates sharing the same address.
          </p>
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="price-id">Price ID</Label>
          <p className="text-xs text-muted-foreground">
            Use the Stripe price that reflects the amount you want to collect for this checkout.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="price-id"
              value={priceId}
              onChange={(e) => setPriceId(e.target.value)}
              placeholder="e.g. price_12345"
              className="min-w-60 flex-1"
            />
            <Button onClick={startCheckout} disabled={!priceId || loadingCheckout} variant="outline">
              {loadingCheckout ? "Creating checkout..." : "Start checkout"}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-id">Customer ID</Label>
          <p className="text-xs text-muted-foreground">
            Open the billing portal for an existing tenant customer record in Stripe.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="customer-id"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="e.g. cus_67890"
              className="min-w-60 flex-1"
            />
            <Button onClick={openBillingPortal} disabled={!customerId || loadingPortal} variant="outline">
              {loadingPortal ? "Opening portal..." : "Launch billing portal"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}


