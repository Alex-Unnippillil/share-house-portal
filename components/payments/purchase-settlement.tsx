"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

type AdjustmentRow = {
  id: string
  roommate: string
  amount: string
  memo: string
}

type InvoiceResponse = {
  status: "queued_for_invoice"
  invoiceAdjustmentRows: Array<{
    lineItem: number
    roommate: string
    amount: number
    memo?: string
  }>
  paymentRecordId: string
  totalAdjustmentAmount: number
  remainingBalance: number
}

type PaymentIntentResponse = {
  status: "payment_intent_created"
  paymentIntentId: string
  paymentIntentClientSecret: string | null
  paymentRecordId: string
  amount: number
}

function generateRowId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return Math.random().toString(36).slice(2)
}

const emptyAdjustmentRow = (): AdjustmentRow => ({
  id: generateRowId(),
  roommate: "",
  amount: "",
  memo: "",
})

export function PurchaseSettlement() {
  const { toast } = useToast()
  const [vendor, setVendor] = useState("")
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split("T")[0])
  const [supplyTotal, setSupplyTotal] = useState("")
  const [memo, setMemo] = useState("")
  const [adjustments, setAdjustments] = useState<AdjustmentRow[]>([emptyAdjustmentRow()])
  const [invoiceSummary, setInvoiceSummary] = useState<InvoiceResponse | null>(null)
  const [paymentSummary, setPaymentSummary] = useState<PaymentIntentResponse | null>(null)
  const [immediateAmount, setImmediateAmount] = useState("")
  const [submittingInvoice, setSubmittingInvoice] = useState(false)
  const [submittingPayment, setSubmittingPayment] = useState(false)

  const parsedTotal = useMemo(() => {
    const value = Number.parseFloat(supplyTotal)
    return Number.isFinite(value) ? value : 0
  }, [supplyTotal])

  const parsedImmediateAmount = useMemo(() => {
    const value = Number.parseFloat(immediateAmount || supplyTotal)
    return Number.isFinite(value) ? value : 0
  }, [immediateAmount, supplyTotal])

  const adjustmentTotal = useMemo(() => {
    return adjustments.reduce((sum, row) => {
      const value = Number.parseFloat(row.amount)
      if (Number.isFinite(value)) {
        return sum + value
      }
      return sum
    }, 0)
  }, [adjustments])

  const remainingBalance = useMemo(() => Number((parsedTotal - adjustmentTotal).toFixed(2)), [parsedTotal, adjustmentTotal])

  const hasInvoiceInputs = vendor.trim() && purchaseDate && parsedTotal > 0

  const filteredAdjustments = adjustments.filter((row) => row.roommate.trim() && Number.parseFloat(row.amount) > 0)

  const resetInvoiceForm = () => {
    setInvoiceSummary(null)
  }

  const resetPaymentSummary = () => {
    setPaymentSummary(null)
  }

  const handleAdjustmentChange = (id: string, field: keyof AdjustmentRow, value: string) => {
    resetInvoiceForm()
    resetPaymentSummary()
    setAdjustments((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    )
  }

  const addAdjustmentRow = () => {
    resetInvoiceForm()
    resetPaymentSummary()
    setAdjustments((rows) => [...rows, emptyAdjustmentRow()])
  }

  const removeAdjustmentRow = (id: string) => {
    resetInvoiceForm()
    resetPaymentSummary()
    setAdjustments((rows) => (rows.length > 1 ? rows.filter((row) => row.id !== id) : rows))
  }

  const sharedSupplyPayload = () => ({
    vendor: vendor.trim(),
    purchaseDate,
    total: parsedTotal,
    memo: memo.trim() || undefined,
    adjustments: filteredAdjustments.map((row) => ({
      roommate: row.roommate.trim(),
      amount: Number.parseFloat(row.amount),
      memo: row.memo.trim() || undefined,
    })),
  })

  const validateSharedInputs = () => {
    if (!vendor.trim()) {
      toast({
        title: "Vendor name required",
        description: "Add the store or supplier so we can label the settlement correctly.",
        variant: "destructive",
      })
      return false
    }

    if (!purchaseDate) {
      toast({
        title: "Purchase date missing",
        description: "Select when the supplies were purchased.",
        variant: "destructive",
      })
      return false
    }

    if (!(parsedTotal > 0)) {
      toast({
        title: "Total amount required",
        description: "Enter the full amount that should be settled.",
        variant: "destructive",
      })
      return false
    }

    return true
  }

  const submitInvoiceAdjustments = async () => {
    if (!validateSharedInputs()) {
      return
    }

    if (filteredAdjustments.length === 0) {
      toast({
        title: "Add at least one roommate",
        description: "Invoice settlements need to include who should be charged.",
        variant: "destructive",
      })
      return
    }

    setSubmittingInvoice(true)
    resetInvoiceForm()

    try {
      const response = await fetch("/api/billing/settlements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "invoice",
          supply: sharedSupplyPayload(),
        }),
      })

      const data = (await response.json()) as InvoiceResponse | Error

      if (!response.ok) {
        const message = data && "error" in data ? data.error : "Unable to schedule invoice adjustments"
        throw new Error(message)
      }

      const invoiceData = data as InvoiceResponse
      setInvoiceSummary(invoiceData)
      toast({
        title: "Invoice adjustments scheduled",
        description: `We will add ${invoiceData.invoiceAdjustmentRows.length} line item(s) to your next rent invoice.`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to schedule invoice adjustments"
      toast({
        title: "Settlement failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setSubmittingInvoice(false)
    }
  }

  const submitImmediatePayment = async () => {
    if (!validateSharedInputs()) {
      return
    }

    if (!(parsedImmediateAmount > 0)) {
      toast({
        title: "Amount required",
        description: "Enter how much you would like to pay right now.",
        variant: "destructive",
      })
      return
    }

    setSubmittingPayment(true)
    resetPaymentSummary()

    try {
      const response = await fetch("/api/billing/settlements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "payment_intent",
          supply: {
            ...sharedSupplyPayload(),
            total: parsedImmediateAmount,
          },
        }),
      })

      const data = (await response.json()) as PaymentIntentResponse | Error

      if (!response.ok) {
        const message = data && "error" in data ? data.error : "Unable to create Stripe PaymentIntent"
        throw new Error(message)
      }

      const paymentData = data as PaymentIntentResponse
      setPaymentSummary(paymentData)
      toast({
        title: "Stripe payment ready",
        description: "Complete the payment with your saved card or share the client secret with roommates.",
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create Stripe PaymentIntent"
      toast({
        title: "Payment failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setSubmittingPayment(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase settlements</CardTitle>
        <CardDescription>
          Decide whether to fold shared supply purchases into the next rent invoice or settle up immediately through Stripe.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor</Label>
            <Input
              id="vendor"
              placeholder="Trader Joe&apos;s, Target, local hardware store..."
              value={vendor}
              onChange={(event) => {
                resetInvoiceForm()
                resetPaymentSummary()
                setVendor(event.target.value)
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchase-date">Purchase date</Label>
            <Input
              id="purchase-date"
              type="date"
              value={purchaseDate}
              onChange={(event) => {
                resetInvoiceForm()
                resetPaymentSummary()
                setPurchaseDate(event.target.value)
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="total">Total amount</Label>
            <Input
              id="total"
              inputMode="decimal"
              placeholder="0.00"
              value={supplyTotal}
              onChange={(event) => {
                resetInvoiceForm()
                resetPaymentSummary()
                setSupplyTotal(event.target.value)
              }}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="memo">Notes</Label>
          <Textarea
            id="memo"
            placeholder="Remind everyone what was purchased or why the charge is being split."
            value={memo}
            onChange={(event) => {
              resetInvoiceForm()
              resetPaymentSummary()
              setMemo(event.target.value)
            }}
          />
        </div>
        <Tabs defaultValue="invoice" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invoice">Add to next rent invoice</TabsTrigger>
            <TabsTrigger value="payment">Pay immediately</TabsTrigger>
          </TabsList>
          <TabsContent value="invoice" className="space-y-6">
            <div className="space-y-4">
              <div className="grid gap-4">
                {adjustments.map((row, index) => (
                  <div key={row.id} className="grid gap-4 rounded-lg border p-4 md:grid-cols-[1fr,120px]">
                    <div className="space-y-2">
                      <Label htmlFor={`roommate-${row.id}`}>Roommate</Label>
                      <Input
                        id={`roommate-${row.id}`}
                        placeholder="Name on the lease"
                        value={row.roommate}
                        onChange={(event) => handleAdjustmentChange(row.id, "roommate", event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`amount-${row.id}`}>Amount</Label>
                      <Input
                        id={`amount-${row.id}`}
                        inputMode="decimal"
                        placeholder="0.00"
                        value={row.amount}
                        onChange={(event) => handleAdjustmentChange(row.id, "amount", event.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor={`memo-${row.id}`} className="sr-only">
                        Memo
                      </Label>
                      <Textarea
                        id={`memo-${row.id}`}
                        placeholder="Optional description for this line item"
                        value={row.memo}
                        onChange={(event) => handleAdjustmentChange(row.id, "memo", event.target.value)}
                      />
                    </div>
                    <div className="flex items-center justify-end md:col-span-2">
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() => removeAdjustmentRow(row.id)}
                        disabled={adjustments.length === 1}
                      >
                        Remove line
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground md:col-span-2">
                      Line {index + 1}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" onClick={addAdjustmentRow}>
                  Add another roommate
                </Button>
                <div className="text-right text-sm text-muted-foreground">
                  <p>Allocated: ${adjustmentTotal.toFixed(2)}</p>
                  {hasInvoiceInputs && (
                    <p>
                      Remaining balance: <span className={remainingBalance === 0 ? "text-emerald-600" : "text-amber-600"}>${remainingBalance.toFixed(2)}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
            <Button type="button" onClick={submitInvoiceAdjustments} disabled={submittingInvoice}>
              {submittingInvoice ? "Scheduling..." : "Add to next invoice"}
            </Button>
            {invoiceSummary && (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                <p className="font-medium">Invoice adjustments created</p>
                <ul className="mt-2 space-y-1">
                  {invoiceSummary.invoiceAdjustmentRows.map((item) => (
                    <li key={item.lineItem}>
                      Line {item.lineItem}: {item.roommate} – ${item.amount.toFixed(2)}
                      {item.memo ? ` (${item.memo})` : ""}
                    </li>
                  ))}
                </ul>
                <p className="mt-2">Remaining balance tracked: ${invoiceSummary.remainingBalance.toFixed(2)}</p>
                <p className="text-muted-foreground">Ledger reference: {invoiceSummary.paymentRecordId}</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="payment" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="immediate-amount">Amount to pay now</Label>
                <Input
                  id="immediate-amount"
                  inputMode="decimal"
                  placeholder={supplyTotal || "0.00"}
                  value={immediateAmount}
                  onChange={(event) => {
                    resetPaymentSummary()
                    setImmediateAmount(event.target.value)
                  }}
                />
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  We create a Stripe PaymentIntent using the vendor, purchase date, and any notes so your property manager sees a
                  complete audit trail.
                </p>
                {memo ? <p className="rounded-md border bg-background p-3">Memo on file: {memo}</p> : null}
              </div>
            </div>
            <Button type="button" onClick={submitImmediatePayment} disabled={submittingPayment}>
              {submittingPayment ? "Contacting Stripe..." : "Create Stripe PaymentIntent"}
            </Button>
            {paymentSummary && (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                <p className="font-medium">Stripe payment ready</p>
                <p>
                  Intent ID: <span className="font-mono">{paymentSummary.paymentIntentId}</span>
                </p>
                <p>
                  Client secret: <span className="font-mono break-all">{paymentSummary.paymentIntentClientSecret ?? "(not returned)"}</span>
                </p>
                <p className="text-muted-foreground">
                  Ledger reference: {paymentSummary.paymentRecordId} — ${paymentSummary.amount.toFixed(2)} scheduled for capture.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
