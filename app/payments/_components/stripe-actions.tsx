"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface PlaidConsentText {
  bankLinking: string
  autopay: string
}

export function StripeActions() {
  const [priceId, setPriceId] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [tenantId, setTenantId] = useState("")
  const [unitId, setUnitId] = useState("")
  const [mode, setMode] = useState<"payment" | "subscription">("payment")
  const [loadingCheckout, setLoadingCheckout] = useState(false)
  const [loadingPortal, setLoadingPortal] = useState(false)
  const [publicToken, setPublicToken] = useState("")
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [linkingBank, setLinkingBank] = useState(false)
  const [linkConsent, setLinkConsent] = useState<PlaidConsentText | null>(null)
  const [achMessage, setAchMessage] = useState<string>("")

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

  const initializeBankLinking = async () => {
    setAchMessage("")
    try {
      const res = await fetch("/api/plaid/link-token", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error?.message || "Unable to initialize bank linking")
      }

      setLinkConsent(data?.consent ?? null)
      setAchMessage(
        "Plaid Link token created. Complete Plaid Link in your frontend integration and paste the returned public token below to finish setup.",
      )
    } catch (error) {
      console.error(error)
      setAchMessage("Unable to initialize Plaid link token. Please try again.")
    }
  }

  const linkBankAccount = async () => {
    if (!publicToken || !consentAccepted) {
      setAchMessage("You must provide a Plaid public token and accept consent before linking a bank account.")
      return
    }

    setLinkingBank(true)
    setAchMessage("")

    try {
      const res = await fetch("/api/plaid/exchange-public-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicToken }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error?.message || "Unable to link bank account")
      }

      setAchMessage(
        `${data?.linkedAccounts?.length ?? 0} bank account(s) linked for ACH. ${data?.achSettlement?.pendingMessage ?? ""}`,
      )
    } catch (error) {
      console.error(error)
      setAchMessage("Bank linking failed. Confirm your public token and try again.")
    } finally {
      setLinkingBank(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        <div className="space-y-3 rounded-md border bg-muted/20 p-4">
          <p className="text-sm font-medium">ACH bank linking (Plaid + Stripe)</p>
          <p className="text-xs text-muted-foreground">
            Link checking/savings accounts through Plaid. We only store tokenized IDs and masked account metadata (for example, bank name and last 4 digits).
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={initializeBankLinking} variant="outline">
              Create Plaid Link Token
            </Button>
          </div>
          {linkConsent ? (
            <div className="space-y-2 rounded-md border bg-background p-3 text-xs text-muted-foreground">
              <p>{linkConsent.bankLinking}</p>
              <p>{linkConsent.autopay}</p>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="plaid-public-token">Plaid public token</Label>
            <Input
              id="plaid-public-token"
              value={publicToken}
              onChange={(e) => setPublicToken(e.target.value)}
              placeholder="public-sandbox-..."
            />
          </div>
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={consentAccepted}
              onChange={(e) => setConsentAccepted(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I authorize tokenized bank linking for ACH debits and consent to recurring autopay withdrawals according to my lease terms.
            </span>
          </label>
          <Button
            type="button"
            onClick={linkBankAccount}
            disabled={!publicToken || !consentAccepted || linkingBank}
            variant="outline"
          >
            {linkingBank ? "Linking..." : "Exchange Public Token"}
          </Button>
          {achMessage ? <p className="text-xs text-muted-foreground">{achMessage}</p> : null}
        </div>

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

