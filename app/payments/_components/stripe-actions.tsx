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
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={priceId}
            onChange={(e) => setPriceId(e.target.value)}
            placeholder="price_123 (test price id)"
            className="min-w-56 flex-1"
          />
          <Button onClick={startCheckout} disabled={!priceId || loadingCheckout} variant="outline">
            {loadingCheckout ? "Creating..." : "Create Checkout"}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="cus_123 (Stripe customer id)"
            className="min-w-56 flex-1"
          />
          <Button onClick={openBillingPortal} disabled={!customerId || loadingPortal} variant="outline">
            {loadingPortal ? "Opening..." : "Open Billing Portal"}
          </Button>
        </div>
      </div>
    </div>
  )
}


