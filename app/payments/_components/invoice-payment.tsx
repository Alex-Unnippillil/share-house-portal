"use client"

import { FormEvent, useMemo, useState } from "react"
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import type { StripeElementsOptions } from "@stripe/stripe-js"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = publishableKey ? loadStripe(publishableKey) : null

type IntentDetails = {
  invoiceId: string
  paymentIntentId: string
  clientSecret: string
  amount: number
  currency: string
  status?: string
}

export function InvoicePayment() {
  const [invoiceId, setInvoiceId] = useState("")
  const [intent, setIntent] = useState<IntentDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const elementOptions = useMemo<StripeElementsOptions | undefined>(() => {
    if (!intent) return undefined
    return {
      clientSecret: intent.clientSecret,
      appearance: { theme: "stripe" },
    }
  }, [intent])

  const handleCreateIntent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedInvoiceId = invoiceId.trim()
    if (!trimmedInvoiceId) {
      setError("Enter an invoice ID before continuing.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/stripe/invoices/${encodeURIComponent(trimmedInvoiceId)}/intent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({}),
        },
      )

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        const message =
          payload && typeof payload.error === "string" && payload.error.length > 0
            ? payload.error
            : "Unable to create a payment intent for this invoice."
        throw new Error(message)
      }

      if (!payload?.clientSecret) {
        throw new Error("Payment intent response was missing a client secret.")
      }

      const rawAmount =
        typeof payload.amount === "number" ? payload.amount : Number(payload.amount)
      const parsedAmount = Number.isFinite(rawAmount) ? rawAmount : 0

      setIntent({
        invoiceId: typeof payload.invoiceId === "string" ? payload.invoiceId : trimmedInvoiceId,
        paymentIntentId:
          typeof payload.paymentIntentId === "string" ? payload.paymentIntentId : "",
        clientSecret: payload.clientSecret,
        amount: parsedAmount,
        currency:
          typeof payload.currency === "string" && payload.currency.length > 0
            ? payload.currency.toUpperCase()
            : "USD",
        status: typeof payload.status === "string" ? payload.status : undefined,
      })
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to create a payment intent for this invoice."
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setIntent(null)
    setError(null)
  }

  if (!publishableKey) {
    return (
      <p className="text-sm text-muted-foreground">
        Configure <code className="font-mono text-xs">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> to
        enable invoice payments.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {!intent ? (
        <form onSubmit={handleCreateIntent} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invoice-id">Invoice ID</Label>
            <Input
              id="invoice-id"
              value={invoiceId}
              onChange={(event) => setInvoiceId(event.target.value)}
              placeholder="inv_123 or invoice UUID"
              autoComplete="off"
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={loading || invoiceId.trim().length === 0}>
              {loading ? "Creating intent..." : "Create payment intent"}
            </Button>
          </div>
        </form>
      ) : stripePromise && elementOptions ? (
        <Elements stripe={stripePromise} options={elementOptions}>
          <ConfirmInvoicePayment
            intent={intent}
            onReset={() => {
              reset()
              setInvoiceId("")
            }}
          />
        </Elements>
      ) : (
        <p className="text-sm text-muted-foreground">
          Stripe is not configured in this environment.
        </p>
      )}
    </div>
  )
}

type ConfirmInvoicePaymentProps = {
  intent: IntentDetails
  onReset: () => void
}

type MessageVariant = "default" | "success" | "error"

function ConfirmInvoicePayment({ intent, onReset }: ConfirmInvoicePaymentProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageVariant, setMessageVariant] = useState<MessageVariant>("default")

  const formattedAmount = useMemo(() => {
    const amount = Number.isFinite(intent.amount) ? intent.amount : 0
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: intent.currency || "USD",
      }).format(amount)
    } catch (error) {
      console.error("Unable to format currency", error)
      return `${amount.toFixed(2)} ${intent.currency}`
    }
  }, [intent.amount, intent.currency])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!stripe || !elements) {
      setMessage("Stripe has not finished loading. Please try again in a moment.")
      setMessageVariant("error")
      return
    }

    setIsProcessing(true)
    setMessage(null)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payments?invoice=${encodeURIComponent(intent.invoiceId)}`,
      },
      redirect: "if_required",
    })

    if (error) {
      setMessage(error.message ?? "Unable to confirm payment.")
      setMessageVariant("error")
      setIsProcessing(false)
      return
    }

    if (paymentIntent) {
      switch (paymentIntent.status) {
        case "succeeded":
          setMessage("Payment succeeded! A receipt will be emailed to you shortly.")
          setMessageVariant("success")
          break
        case "processing":
          setMessage("Your payment is processing. We'll update you when it's complete.")
          setMessageVariant("default")
          break
        case "requires_payment_method":
          setMessage("Payment failed. Please try another payment method.")
          setMessageVariant("error")
          break
        default:
          setMessage(`Payment status: ${paymentIntent.status}.`)
          setMessageVariant("default")
          break
      }
    } else {
      setMessage("Payment confirmation submitted.")
      setMessageVariant("default")
    }

    setIsProcessing(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3 rounded-lg border p-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">Invoice {intent.invoiceId}</p>
          <p className="text-sm text-muted-foreground">Amount due: {formattedAmount}</p>
          {intent.paymentIntentId && (
            <p className="text-xs text-muted-foreground">Payment Intent: {intent.paymentIntentId}</p>
          )}
          {intent.status && (
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Current status: {intent.status}
            </p>
          )}
        </div>
        <PaymentElement />
      </div>
      {message && (
        <p
          className={cn("text-sm", {
            "text-destructive": messageVariant === "error",
            "text-emerald-600": messageVariant === "success",
            "text-muted-foreground": messageVariant === "default",
          })}
        >
          {message}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isProcessing || !stripe || !elements}>
          {isProcessing ? "Confirming..." : "Confirm payment"}
        </Button>
        <Button type="button" variant="outline" onClick={onReset} disabled={isProcessing}>
          Use a different invoice
        </Button>
      </div>
    </form>
  )
}
