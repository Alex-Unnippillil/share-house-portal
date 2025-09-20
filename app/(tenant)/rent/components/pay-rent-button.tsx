"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

import { confirmRentPayment, startRentPaymentSession } from "../actions"

type PayRentButtonProps = {
  invoiceId: string | null
  amountDue: number
  disabled?: boolean
}

export function PayRentButton({ invoiceId, amountDue, disabled }: PayRentButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleClick = () => {
    if (!invoiceId || amountDue <= 0) return
    setError(null)

    startTransition(async () => {
      try {
        const session = await startRentPaymentSession({ invoiceId, provider: "stripe" })

        if (!session || "error" in session) {
          setError(session?.error ?? "Unable to start the payment session.")
          return
        }

        if (session.paymentId) {
          await confirmRentPayment({
            paymentId: session.paymentId,
            amount: session.amount,
            status: "succeeded",
          })
        }

        toast({
          title: "Payment recorded",
          description: "Your rent payment was captured successfully.",
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unexpected error"
        setError(message)
      }
    })
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleClick}
        disabled={disabled || !invoiceId || amountDue <= 0 || isPending}
      >
        {isPending ? "Processing…" : "Pay rent"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
