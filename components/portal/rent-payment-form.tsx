"use client"

import { useMemo, useState } from "react"
import { addMonths, format, startOfMonth } from "date-fns"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

const paymentMethods = [
  { value: "bank-transfer", label: "Bank transfer" },
  { value: "debit-card", label: "Debit card" },
  { value: "credit-card", label: "Credit card" },
  { value: "ach", label: "ACH" },
]

type PaymentRecord = {
  id: string
  month: string
  amount: number
  method: string
  status: "Processing" | "Completed"
  submittedAt: Date
  notes?: string
}

const MONTHLY_RENT = 1850

export function RentPaymentForm() {
  const [month, setMonth] = useState(() => format(new Date(), "MMMM yyyy"))
  const [amount, setAmount] = useState(() => MONTHLY_RENT.toFixed(2))
  const [method, setMethod] = useState(paymentMethods[0].value)
  const [notes, setNotes] = useState("")
  const [status, setStatus] = useState<"idle" | "processing" | "success">("idle")
  const [feedback, setFeedback] = useState<string | null>(null)
  const [confirmationNumber, setConfirmationNumber] = useState<string | null>(null)
  const [history, setHistory] = useState<PaymentRecord[]>(() => [
    {
      id: "SH-582341",
      month: format(addMonths(new Date(), -1), "MMMM yyyy"),
      amount: MONTHLY_RENT,
      method: "Bank transfer",
      status: "Completed",
      submittedAt: addMonths(new Date(), -1),
      notes: "AutoPay executed successfully.",
    },
    {
      id: "SH-512774",
      month: format(addMonths(new Date(), -2), "MMMM yyyy"),
      amount: MONTHLY_RENT,
      method: "ACH",
      status: "Completed",
      submittedAt: addMonths(new Date(), -2),
      notes: "Payment confirmed within one business day.",
    },
  ])

  const nextDueDate = useMemo(
    () => startOfMonth(addMonths(new Date(), 1)),
    []
  )

  const nextDueDateLabel = useMemo(
    () => format(nextDueDate, "MMMM d, yyyy"),
    [nextDueDate]
  )

  const autopayEligible = useMemo(() => Number.parseFloat(amount) >= MONTHLY_RENT, [amount])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const numericAmount = Number.parseFloat(amount)

    if (!month.trim() || Number.isNaN(numericAmount) || numericAmount <= 0) {
      setFeedback("Enter a valid amount and billing month before submitting.")
      setStatus("idle")
      return
    }

    setStatus("processing")
    setFeedback(null)
    setConfirmationNumber(null)

    const confirmation = `SH-${Math.floor(100000 + Math.random() * 900000)}`

    window.setTimeout(() => {
      const readableMethod =
        paymentMethods.find((option) => option.value === method)?.label ?? "Bank transfer"

      const record: PaymentRecord = {
        id: confirmation,
        month,
        amount: numericAmount,
        method: readableMethod,
        status: "Completed",
        submittedAt: new Date(),
        notes: notes.trim() || undefined,
      }

      setHistory((previous) => [record, ...previous])
      setStatus("success")
      setFeedback("Payment scheduled successfully. You will receive an email receipt shortly.")
      setConfirmationNumber(confirmation)
      setNotes("")
    }, 900)
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">Rent payment</CardTitle>
            <CardDescription>
              Submit this month&apos;s payment securely. Funds clear automatically within one business day.
            </CardDescription>
          </div>
          <Badge variant={autopayEligible ? "default" : "secondary"} className="whitespace-nowrap">
            {autopayEligible ? "AutoPay ready" : "Update amount"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="billing-month">Billing month</Label>
              <Input
                id="billing-month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                placeholder="July 2024"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rent-amount">Amount due (USD)</Label>
              <Input
                id="rent-amount"
                inputMode="decimal"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger id="payment-method" className="w-full">
                  <SelectValue placeholder="Choose how you would like to pay" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="memo">Memo (optional)</Label>
              <Textarea
                id="memo"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Example: Covering July and pet fee."
                className="min-h-[96px]"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Next due date: <span className="font-medium text-foreground">{nextDueDateLabel}</span>
            </p>
            <Button type="submit" disabled={status === "processing"}>
              {status === "processing" ? "Submitting payment..." : "Schedule payment"}
            </Button>
          </div>
        </form>
        <div className="rounded-lg border bg-muted/30 p-4 text-sm">
          <p className="font-medium">Payment timeline</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>• Payments submitted before 6:00 PM clear the next business day.</li>
            <li>• Receipts are emailed automatically to all lease holders.</li>
            <li>• Need assistance? Message management in the community board below.</li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium">Recent payments</h4>
          <ul className="mt-3 space-y-3">
            {history.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-col gap-1 rounded-lg border bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium">
                    {payment.month} · ${payment.amount.toFixed(2)} ({payment.method})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Submitted {format(payment.submittedAt, "MMM d, yyyy p")}
                  </p>
                </div>
                <Badge variant="outline" className="self-start sm:self-center">
                  {payment.status}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2">
        {feedback ? (
          <p className="text-sm text-foreground">{feedback}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            For partial payments, include details in the memo so we can reconcile balances quickly.
          </p>
        )}
        {confirmationNumber ? (
          <p className="text-xs text-muted-foreground">
            Confirmation number <span className="font-medium text-foreground">{confirmationNumber}</span>. Keep this for your records.
          </p>
        ) : null}
      </CardFooter>
    </Card>
  )
}
