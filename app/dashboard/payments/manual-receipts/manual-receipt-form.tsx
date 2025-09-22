"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import {
  ManualReceiptFormInput,
  manualReceiptSchema,
} from "@/lib/schemas/payments"

import { recordManualEtransferReceipt } from "./actions"

type ManualReceiptFormProps = {
  defaults: {
    invoiceId: string
    tenantId: string
    tenantName: string
    amount: number
    referenceCode: string
  }
}

function toDateTimeLocalInputValue(date: Date) {
  const pad = (value: number) => `${value}`.padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function ManualReceiptForm({ defaults }: ManualReceiptFormProps) {
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<ManualReceiptFormInput>({
    resolver: zodResolver(manualReceiptSchema),
    defaultValues: {
      invoiceId: defaults.invoiceId,
      tenantId: defaults.tenantId,
      tenantName: defaults.tenantName,
      amount: defaults.amount,
      referenceCode: defaults.referenceCode,
      receivedAt: toDateTimeLocalInputValue(new Date()),
      memo: "",
    },
  })

  const handleSubmit = form.handleSubmit((values) => {
    setServerError(null)
    startTransition(async () => {
      const result = await recordManualEtransferReceipt(values)

      if (!result.success) {
        setServerError(result.error)
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, messages]) => {
            if (!messages?.length) return
            form.setError(field as keyof ManualReceiptFormInput, {
              type: "server",
              message: messages.join(" "),
            })
          })
        }
        return
      }

      toast({
        title: "Manual receipt recorded",
        description: `Invoice ${result.data.invoice_id} marked paid via e-Transfer.`,
      })

      form.reset({
        invoiceId: defaults.invoiceId,
        tenantId: defaults.tenantId,
        tenantName: defaults.tenantName,
        amount: defaults.amount,
        referenceCode: defaults.referenceCode,
        receivedAt: toDateTimeLocalInputValue(new Date()),
        memo: "",
      })
    })
  })

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="invoiceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Invoice number</FormLabel>
                <FormControl>
                  <Input placeholder="INV-2024-0007" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="referenceCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reference code</FormLabel>
                <FormControl>
                  <Input placeholder="0007-ABC123" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="tenantName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tenant name</FormLabel>
                <FormControl>
                  <Input placeholder="Casey Morgan" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tenantId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tenant ID</FormLabel>
                <FormControl>
                  <Input placeholder="tenant-3a" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount received (CAD)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" placeholder="1825.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="receivedAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Received at</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="memo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Internal notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Include bank confirmation number or reconciliation comments"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {serverError ? <p className="text-sm font-medium text-destructive">{serverError}</p> : null}
        <Button type="submit" disabled={isPending} className="w-full md:w-auto">
          {isPending ? "Saving receipt…" : "Record manual receipt"}
        </Button>
      </form>
    </Form>
  )
}
