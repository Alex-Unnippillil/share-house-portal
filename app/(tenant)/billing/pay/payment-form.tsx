"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { toast } from "sonner"

import type { InvoiceSummary } from "./page"
import { getPaymentMethodCopy, fromMinorUnitAmount, toMinorUnitAmount, type PaymentIntentStatus, type PaymentMethodType } from "./utils"
import { initiatePayment, updatePaymentRecord, type PaymentInitiationResult, type PaymentUpdateResult } from "./actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = publishableKey ? loadStripe(publishableKey) : null

type PaymentState = PaymentInitiationResult & {
  paymentMethodType: PaymentMethodType
  invoiceId: string
}

type PaymentFormProps = {
  invoices: InvoiceSummary[]
  tenantEmail: string
}

const statusCopy: Record<PaymentIntentStatus, string> = {
  canceled: "The payment was canceled. No funds were collected.",
  processing: "Stripe is processing the payment. We'll notify you once it's complete.",
  requires_action: "Additional authentication is required to finish this payment.",
  requires_capture: "The payment is authorised and waiting for capture by the property manager.",
  requires_confirmation: "We need a confirmation attempt from this device to continue.",
  requires_payment_method: "A valid payment method is still needed to complete this invoice.",
  succeeded: "Payment completed successfully. A receipt is on its way to your inbox.",
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(amount / 100)
}

export default function PaymentForm({ invoices, tenantEmail }: PaymentFormProps) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(invoices[0]?.id ?? "")
  const [amountInput, setAmountInput] = useState<string>(
    invoices[0] ? fromMinorUnitAmount(invoices[0].amountDue) : ""
  )
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("card")
  const [paymentState, setPaymentState] = useState<PaymentState | null>(null)
  const [updateState, setUpdateState] = useState<PaymentUpdateResult | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isInitiating, startInitiate] = useTransition()

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null,
    [invoices, selectedInvoiceId]
  )

  useEffect(() => {
    if (selectedInvoice) {
      setAmountInput(fromMinorUnitAmount(selectedInvoice.amountDue))
      setPaymentState(null)
      setUpdateState(null)
      setStatusMessage(null)
      setErrorMessage(null)
    }
  }, [selectedInvoiceId, selectedInvoice?.amountDue])

  useEffect(() => {
    if (paymentState) {
      setStatusMessage("Payment intent created. Confirm the details below to finish.")
    }
  }, [paymentState?.clientSecret])

  const handleInitiate = () => {
    if (!selectedInvoice) {
      setErrorMessage("Select an invoice to continue")
      return
    }

    let amountInMinorUnits: number
    try {
      amountInMinorUnits = toMinorUnitAmount(amountInput)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Enter a valid amount")
      return
    }

    if (amountInMinorUnits <= 0) {
      setErrorMessage("Amount must be greater than zero")
      return
    }

    if (amountInMinorUnits > selectedInvoice.amountDue) {
      setErrorMessage("You cannot pay more than the outstanding balance")
      return
    }

    setErrorMessage(null)
    startInitiate(async () => {
      try {
        const result = await initiatePayment({
          invoiceId: selectedInvoice.id,
          amount: amountInMinorUnits,
          paymentMethodType: paymentMethod,
        })

        setPaymentState({
          ...result,
          paymentMethodType: paymentMethod,
          invoiceId: selectedInvoice.id,
        })
        setUpdateState(null)
        toast.success("Payment intent created")
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to create payment intent"
        setErrorMessage(message)
        toast.error(message)
      }
    })
  }

  const methodCopy = getPaymentMethodCopy(paymentMethod)
  const invoiceDetails = selectedInvoice
    ? `${formatCurrency(selectedInvoice.amountDue, selectedInvoice.currency)} due${
        selectedInvoice.dueDate ? ` on ${new Date(selectedInvoice.dueDate).toLocaleDateString()}` : ""
      }`
    : "Select an invoice"

  if (invoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No invoices to pay</CardTitle>
          <CardDescription>
            You&rsquo;re all caught up. We&rsquo;ll notify you here when a new invoice is issued.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!stripePromise) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stripe is not configured</CardTitle>
          <CardDescription>
            Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to enable embedded payment collection.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>Invoice details</CardTitle>
          <CardDescription>Pick an invoice and choose how much you want to cover right now.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="invoice">Invoice</Label>
            <Select
              value={selectedInvoiceId}
              onValueChange={(value) => setSelectedInvoiceId(value)}
              disabled={invoices.length === 0 || Boolean(paymentState)}
            >
              <SelectTrigger id="invoice">
                <SelectValue placeholder="Select an invoice" />
              </SelectTrigger>
              <SelectContent>
                {invoices.map((invoice) => (
                  <SelectItem key={invoice.id} value={invoice.id}>
                    {formatCurrency(invoice.amountDue, invoice.currency)} · {invoice.description ?? "Rent"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">{invoiceDetails}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount to pay</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              disabled={Boolean(paymentState)}
              inputMode="decimal"
            />
            <p className="text-xs text-muted-foreground">
              Up to {selectedInvoice ? formatCurrency(selectedInvoice.amountDue, selectedInvoice.currency) : "0.00"}
            </p>
          </div>
          <div className="space-y-3">
            <Label>Payment method</Label>
            <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethodType)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="card">Card</TabsTrigger>
                <TabsTrigger value="acss_debit">Bank debit (PAD)</TabsTrigger>
              </TabsList>
              <TabsContent value="card" />
              <TabsContent value="acss_debit" />
            </Tabs>
            <div className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{methodCopy.title}</p>
              <p>{methodCopy.description}</p>
              {paymentMethod === "acss_debit" ? (
                <p className="mt-2 text-xs">
                  Use Stripe&rsquo;s test bank numbers like 000123456 for account and 110000000 for transit to simulate
                  approval.
                </p>
              ) : (
                <p className="mt-2 text-xs">Stripe test cards such as 4242 4242 4242 4242 work great here.</p>
              )}
            </div>
          </div>
          {errorMessage ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">Receipts will be sent to {tenantEmail || "your email on file"}.</div>
          <Button onClick={handleInitiate} disabled={isInitiating || !selectedInvoice || Boolean(paymentState)}>
            {isInitiating ? "Creating intent..." : "Start payment"}
          </Button>
        </CardFooter>
      </Card>

      {paymentState?.clientSecret ? (
        <Elements
          key={paymentState.clientSecret}
          stripe={stripePromise}
          options={{
            clientSecret: paymentState.clientSecret,
            appearance: { theme: "stripe" },
          }}
        >
          <PaymentConfirmation
            amount={paymentState.amount}
            currency={paymentState.currency}
            clientSecret={paymentState.clientSecret}
            invoiceId={paymentState.invoiceId}
            onReset={() => {
              setPaymentState(null)
              setUpdateState(null)
              setStatusMessage(null)
              setAmountInput(selectedInvoice ? fromMinorUnitAmount(selectedInvoice.amountDue) : "")
            }}
            onStatusUpdated={(update) => {
              setUpdateState(update)
              setPaymentState((current) => (current ? { ...current, status: update.status } : current))
              setStatusMessage(statusCopy[update.status])
              if (update.status === "succeeded") {
                setAmountInput(fromMinorUnitAmount(update.remainingAmount))
              }
            }}
            paymentIntentId={paymentState.paymentIntentId}
            paymentMethod={paymentState.paymentMethodType}
          />
        </Elements>
      ) : null}

      {statusMessage ? (
        <Card>
          <CardHeader>
            <CardTitle>Latest status</CardTitle>
            <CardDescription>{statusMessage}</CardDescription>
          </CardHeader>
          {updateState ? (
            <CardContent className="space-y-2 text-sm">
              <p>Invoice is now marked as {updateState.invoiceStatus}.</p>
              <p>
                Remaining balance: {selectedInvoice
                  ? formatCurrency(updateState.remainingAmount, selectedInvoice.currency)
                  : formatCurrency(updateState.remainingAmount, paymentState?.currency ?? "usd")}
              </p>
            </CardContent>
          ) : null}
        </Card>
      ) : null}
    </div>
  )
}

type ConfirmationProps = {
  amount: number
  currency: string
  clientSecret: string
  invoiceId: string
  paymentIntentId: string
  paymentMethod: PaymentMethodType
  onReset: () => void
  onStatusUpdated: (update: PaymentUpdateResult) => void
}

function PaymentConfirmation({
  amount,
  currency,
  clientSecret,
  invoiceId,
  paymentIntentId,
  paymentMethod,
  onReset,
  onStatusUpdated,
}: ConfirmationProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localStatus, setLocalStatus] = useState<PaymentIntentStatus | null>(null)

  const confirmPayment = async () => {
    if (!stripe || !elements) {
      setError("Stripe has not finished loading. Please try again.")
      return
    }

    setIsConfirming(true)
    setError(null)

    try {
      const result =
        paymentMethod === "acss_debit"
          ? await stripe.confirmAcssDebitPayment(clientSecret, {
              elements,
              confirmParams: {
                return_url: `${window.location.origin}/billing/pay/success?invoice=${invoiceId}`,
              },
            })
          : await stripe.confirmPayment({
              elements,
              redirect: "if_required",
              confirmParams: {
                return_url: `${window.location.origin}/billing/pay/success?invoice=${invoiceId}`,
              },
            })

      if (result.error) {
        const message = result.error.message ?? "The payment could not be confirmed"
        setError(message)
        toast.error(message)
        try {
          const update = await updatePaymentRecord({ paymentIntentId, status: "requires_payment_method" })
          setLocalStatus("requires_payment_method")
          onStatusUpdated(update)
        } catch (error) {
          const updateMessage =
            error instanceof Error ? error.message : "Unable to sync failed payment attempt"
          toast.error(updateMessage)
        }
        return
      }

      const status = (result.paymentIntent?.status ?? "processing") as PaymentIntentStatus
      const update = await updatePaymentRecord({ paymentIntentId, status })
      setLocalStatus(status)
      onStatusUpdated(update)
      toast(statusCopy[status])
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected payment error"
      setError(message)
      toast.error(message)
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirm your payment</CardTitle>
        <CardDescription>
          You&rsquo;re paying {formatCurrency(amount, currency)} by {paymentMethod === "card" ? "card" : "pre-authorized debit"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PaymentElement />
        {error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {localStatus ? (
          <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            {statusCopy[localStatus]}
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline" onClick={onReset} disabled={isConfirming}>
          Start over
        </Button>
        <Button onClick={confirmPayment} disabled={isConfirming}>
          {isConfirming ? "Confirming..." : "Confirm payment"}
        </Button>
      </CardFooter>
    </Card>
  )
}
