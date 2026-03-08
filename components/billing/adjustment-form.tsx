"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { applyInvoiceAdjustment } from "@/app/(admin)/billing/actions"
import {
  invoiceAdjustmentSchema,
  type InvoiceAdjustmentInput,
} from "@/app/(admin)/billing/schemas"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrencyFromCents } from "@/lib/utils"

export type InvoiceSummary = {
  id: string
  reference?: string | null
  balance_cents: number
  currency?: string | null
}

type AdjustmentFormProps = {
  invoices: InvoiceSummary[]
}

type FormValues = InvoiceAdjustmentInput

export function InvoiceAdjustmentForm({ invoices }: AdjustmentFormProps) {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(invoiceAdjustmentSchema),
    defaultValues: {
      type: "credit",
    },
  })

  const selectedInvoiceId = watch("invoiceId")

  useEffect(() => {
    if (!selectedInvoiceId && invoices.length > 0) {
      setValue("invoiceId", invoices[0].id, { shouldDirty: false })
    }
  }, [invoices, selectedInvoiceId, setValue])

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? invoices[0],
    [invoices, selectedInvoiceId]
  )

  const onSubmit = (values: FormValues) => {
    setError(null)
    setMessage(null)

    startTransition(async () => {
      try {
        const result = await applyInvoiceAdjustment(values)
        setMessage(
          `Adjustment recorded. Updated balance: ${formatCurrencyFromCents(
            result.invoice.balance_cents,
            result.invoice.currency ?? "USD"
          )}`
        )
        reset({
          invoiceId: values.invoiceId,
          type: values.type,
          amount: undefined,
          reason: "",
          memo: undefined,
        } as Partial<FormValues>)
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Failed to submit adjustment.")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Issue a billing adjustment</CardTitle>
        <CardDescription>
          Credit or reverse balances for residents. All adjustments are audit logged and reflected in the shared ledger.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="invoiceId"
              render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor="invoiceId">Invoice</Label>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isPending || invoices.length === 0}>
                    <SelectTrigger id="invoiceId" aria-label="Select invoice">
                      <SelectValue placeholder="Choose an invoice" />
                    </SelectTrigger>
                    <SelectContent>
                      {invoices.map((invoice) => (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          {invoice.reference ?? invoice.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.invoiceId && <p className="text-sm text-destructive">{errors.invoiceId.message}</p>}
                  {selectedInvoice && (
                    <p className="text-sm text-muted-foreground">
                      Current balance: {" "}
                      {formatCurrencyFromCents(selectedInvoice.balance_cents, selectedInvoice.currency ?? "USD")}
                    </p>
                  )}
                </div>
              )}
            />

            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor="adjustment-type">Adjustment type</Label>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                    <SelectTrigger id="adjustment-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit">Credit - reduce balance</SelectItem>
                      <SelectItem value="reversal">Reversal - restore balance</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
                </div>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                inputMode="decimal"
                placeholder="150.00"
                {...register("amount")}
                disabled={isPending}
              />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Input id="reason" placeholder="Late fee waiver" {...register("reason")} disabled={isPending} />
              {errors.reason && <p className="text-sm text-destructive">{errors.reason.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="memo">Internal memo</Label>
            <Textarea
              id="memo"
              placeholder="Add internal context (optional)"
              rows={3}
              {...register("memo")}
              disabled={isPending}
            />
            {errors.memo && <p className="text-sm text-destructive">{errors.memo.message}</p>}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-emerald-600">{message}</p>}

          <Button type="submit" disabled={isPending || invoices.length === 0}>
            {isPending ? "Saving adjustment…" : "Record adjustment"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
