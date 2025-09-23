"use client"

import { useMemo, useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import {
  allocatePaymentToCharges,
  applyAllocationsToCharges,
  calculateOutstanding,
  formatAutopayDay,
  getNextOutstandingCharge,
} from "@/lib/payments/catch-up"
import { formatCurrency, parseCurrencyInput, roundToCurrency } from "@/lib/payments/currency"
import { createCatchUpFormSchema } from "@/lib/payments/schemas"
import { AUTOPAY_STATUS_BADGES } from "@/lib/payments/status"
import { formatDate, type IntlPreferences } from "@/lib/utils"
import type {
  CatchUpBalance,
  CatchUpPaymentFormValues,
  CatchUpPaymentSubmissionResult,
} from "@/types/payments"

import { submitCatchUpPayment } from "../actions"

interface CatchUpPaymentCardProps {
  balances: CatchUpBalance[]
  intl?: IntlPreferences
}

type QuickAmountKey = "next" | "half" | "full"

type QuickAmount = {
  key: QuickAmountKey
  label: string
  value: number
}

export function CatchUpPaymentCard({ balances, intl }: CatchUpPaymentCardProps) {
  const schema = useMemo(() => createCatchUpFormSchema(balances), [balances])
  const form = useForm<CatchUpPaymentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      roommateId: balances[0]?.roommateId ?? "",
      amount: balances[0]
        ? calculateOutstanding(balances[0].charges).toFixed(2)
        : "",
      includePropertyManager: false,
      note: "",
    },
  })
  const [isPending, startTransition] = useTransition()
  const [lastResult, setLastResult] = useState<CatchUpPaymentSubmissionResult | null>(null)

  const selectedRoommateId = form.watch("roommateId")
  const amountInputValue = form.watch("amount")

  const selectedBalance = useMemo(
    () => balances.find((balance) => balance.roommateId === selectedRoommateId),
    [balances, selectedRoommateId],
  )

  const handleRoommateChange = (roommateId: string) => {
    form.setValue("roommateId", roommateId, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })

    const balance = balances.find((item) => item.roommateId === roommateId)
    if (!balance) {
      form.setValue("amount", "", {
        shouldDirty: false,
        shouldValidate: true,
      })
      form.setValue("includePropertyManager", false, {
        shouldDirty: false,
        shouldValidate: false,
      })
      form.setValue("note", "", {
        shouldDirty: false,
        shouldValidate: false,
      })
      return
    }

    const outstandingValue = calculateOutstanding(balance.charges)
    form.setValue(
      "amount",
      outstandingValue > 0 ? outstandingValue.toFixed(2) : "0.00",
      { shouldDirty: false, shouldValidate: true },
    )
    form.setValue("includePropertyManager", false, {
      shouldDirty: false,
      shouldValidate: false,
    })
    form.setValue("note", "", { shouldDirty: false, shouldValidate: false })
  }

  const outstandingBalance = selectedBalance
    ? calculateOutstanding(selectedBalance.charges)
    : 0

  const parsedAmount = parseCurrencyInput(amountInputValue)
  const normalizedAmount =
    Number.isFinite(parsedAmount)
      ? Math.min(roundToCurrency(parsedAmount), outstandingBalance)
      : 0

  const allocationPreview = useMemo(() => {
    if (!selectedBalance || normalizedAmount <= 0) {
      return []
    }

    try {
      return allocatePaymentToCharges(selectedBalance.charges, normalizedAmount)
    } catch (error) {
      return []
    }
  }, [normalizedAmount, selectedBalance])

  const updatedChargesPreview = useMemo(() => {
    if (!selectedBalance) {
      return []
    }

    return applyAllocationsToCharges(selectedBalance.charges, allocationPreview)
  }, [allocationPreview, selectedBalance])

  const projectedBalance = selectedBalance
    ? roundToCurrency(calculateOutstanding(updatedChargesPreview))
    : 0

  const coveragePercentage = selectedBalance && outstandingBalance > 0
    ? Math.min(100, Math.round((normalizedAmount / outstandingBalance) * 1000) / 10)
    : 0

  const nextCharge = selectedBalance
    ? getNextOutstandingCharge(selectedBalance.charges)
    : undefined

  const quickAmounts: QuickAmount[] = useMemo(() => {
    if (!selectedBalance || outstandingBalance <= 0) {
      return []
    }

    const amounts: QuickAmount[] = []

    if (nextCharge) {
      amounts.push({
        key: "next",
        label: `Next charge (${formatCurrency(nextCharge.outstandingAmount, selectedBalance.currency, {
          locale: intl?.locale,
        })})`,
        value: roundToCurrency(nextCharge.outstandingAmount),
      })
    }

    const half = roundToCurrency(outstandingBalance / 2)
    if (half > 0) {
      amounts.push({
        key: "half",
        label: `Half balance (${formatCurrency(half, selectedBalance.currency, {
          locale: intl?.locale,
        })})`,
        value: half,
      })
    }

    amounts.push({
      key: "full",
      label: `Pay in full (${formatCurrency(outstandingBalance, selectedBalance.currency, {
        locale: intl?.locale,
      })})`,
      value: roundToCurrency(outstandingBalance),
    })

    return amounts.filter((amount, index, array) =>
      array.findIndex((item) => item.value === amount.value) === index,
    )
  }, [nextCharge, outstandingBalance, selectedBalance])

  const handleQuickAmount = (value: number) => {
    form.setValue("amount", value.toFixed(2), {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  const onSubmit = async (values: CatchUpPaymentFormValues) => {
    const parsed = parseCurrencyInput(values.amount)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: "Enter a valid catch-up amount before submitting.",
      })
      return
    }

    const sanitizedNote = values.note && values.note.trim().length > 0 ? values.note.trim() : undefined

    startTransition(async () => {
      try {
        const result = await submitCatchUpPayment({
          roommateId: values.roommateId,
          amount: roundToCurrency(parsed),
          includePropertyManager: values.includePropertyManager,
          note: sanitizedNote,
        })

        setLastResult(result)
        toast({
          title: `Catch-up scheduled for ${result.roommateName}`,
          description: `${formatCurrency(result.amount, result.currency, {
            locale: intl?.locale,
          })} applied • New balance ${formatCurrency(result.projectedBalance, result.currency, {
            locale: intl?.locale,
          })}`,
        })

        form.setValue(
          "amount",
          result.projectedBalance > 0
            ? result.projectedBalance.toFixed(2)
            : "0.00",
          { shouldDirty: false, shouldValidate: true },
        )
      } catch (error) {
        const description =
          error instanceof Error
            ? error.message
            : "Something went wrong while scheduling the catch-up payment."
        toast({
          variant: "destructive",
          title: "Unable to schedule catch-up payment",
          description,
        })
      }
    })
  }

  const disableSubmit =
    !selectedBalance || outstandingBalance <= 0 || normalizedAmount <= 0 || isPending

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle>One-time catch up</CardTitle>
            <CardDescription>
              Collect partial or one-off payments and apply them to outstanding roommate balances without waiting for the next cycle.
            </CardDescription>
          </div>
          {selectedBalance ? (
            <Badge variant={AUTOPAY_STATUS_BADGES[selectedBalance.autopayStatus].variant}>
              {AUTOPAY_STATUS_BADGES[selectedBalance.autopayStatus].label}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="roommateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Roommate</FormLabel>
                    <Select onValueChange={handleRoommateChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select roommate" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {balances.map((balance) => (
                          <SelectItem key={balance.roommateId} value={balance.roommateId}>
                            {balance.roommateName} · {balance.unitLabel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Outstanding</span>
                  <span>
                    {selectedBalance
                      ? formatCurrency(outstandingBalance, selectedBalance.currency, {
                          locale: intl?.locale,
                        })
                      : "—"}
                  </span>
                </div>
                {selectedBalance ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground">Autopay</p>
                      <p>
                        {formatAutopayDay(selectedBalance.autopayDay)} of each month
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Last payment</p>
                      <p>
                        {formatDate(selectedBalance.lastPaymentDate, {
                          locale: intl?.locale,
                          timeZone: intl?.timeZone,
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1.2fr_1fr]">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catch-up amount</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="decimal"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {selectedBalance
                        ? `${formatCurrency(outstandingBalance, selectedBalance.currency, {
                            locale: intl?.locale,
                          })} outstanding`
                        : "Enter an amount to distribute across open charges."}
                    </FormDescription>
                    <FormMessage />
                    {quickAmounts.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {quickAmounts.map((item) => (
                          <Button
                            key={item.key}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickAmount(item.value)}
                          >
                            {item.label}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </FormItem>
                )}
              />
              <div className="space-y-2 rounded-lg border bg-muted/20 p-4 text-sm">
                <div className="flex items-center justify-between font-medium">
                  <span>Projected remaining</span>
                  <span>
                    {selectedBalance
                      ? formatCurrency(projectedBalance, selectedBalance.currency, {
                          locale: intl?.locale,
                        })
                      : "—"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Covers {coveragePercentage.toFixed(1)}% of the open balance.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium">Allocation preview</h3>
                <p className="text-xs text-muted-foreground">
                  We prioritize the earliest due charges when applying one-time payments.
                </p>
              </div>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2 pl-4 pr-2 font-medium">Charge</th>
                      <th className="py-2 pr-2 font-medium">Due</th>
                      <th className="py-2 pr-2 text-right font-medium">Outstanding</th>
                      <th className="py-2 pr-2 text-right font-medium">Applying</th>
                      <th className="py-2 pr-4 text-right font-medium">Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBalance ? (
                      selectedBalance.charges.map((charge) => {
                        const allocation = allocationPreview.find(
                          (item) => item.chargeId === charge.id,
                        )
                        const updatedCharge = updatedChargesPreview.find(
                          (item) => item.id === charge.id,
                        )
                        const applyingAmount = allocation?.amount ?? 0
                        const remainingAmount = updatedCharge?.outstandingAmount ?? charge.outstandingAmount

                        return (
                          <tr key={charge.id} className="border-t">
                            <td className="py-2 pl-4 pr-2">
                              <div className="font-medium">{charge.description}</div>
                              <div className="text-xs capitalize text-muted-foreground">
                                {charge.category}
                              </div>
                            </td>
                            <td className="py-2 pr-2 text-sm text-muted-foreground">
                              {formatDate(charge.dueDate, {
                                locale: intl?.locale,
                                timeZone: intl?.timeZone,
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                            <td className="py-2 pr-2 text-right">
                              {formatCurrency(charge.outstandingAmount, selectedBalance.currency, {
                                locale: intl?.locale,
                              })}
                            </td>
                            <td className="py-2 pr-2 text-right text-emerald-600">
                              {applyingAmount > 0
                                ? `-${formatCurrency(applyingAmount, selectedBalance.currency, {
                                    locale: intl?.locale,
                                  })}`
                                : "—"}
                            </td>
                            <td className="py-2 pr-4 text-right">
                              {formatCurrency(remainingAmount, selectedBalance.currency, {
                                locale: intl?.locale,
                              })}
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td className="py-4 pl-4 text-sm text-muted-foreground" colSpan={5}>
                          Select a roommate to preview catch-up distribution.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <FormField
              control={form.control}
              name="includePropertyManager"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Send property manager a receipt</FormLabel>
                    <FormDescription>
                      {selectedBalance?.contacts.propertyManager
                        ? `We will copy ${selectedBalance.contacts.propertyManager.email} when we send the confirmation.`
                        : "No property manager email on file for this roommate."}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!selectedBalance?.contacts.propertyManager}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Optional note</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share context for this catch-up payment (visible on the receipt)."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Add up to 280 characters. Leave blank to skip including a note.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-wrap items-center justify-end gap-3">
              <p className="text-xs text-muted-foreground">
                Catch-up payments post to the shared ledger immediately.
              </p>
              <Button disabled={disableSubmit} type="submit">
                {isPending ? "Scheduling..." : "Schedule catch-up"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
      {lastResult ? (
        <>
          <Separator />
          <CardFooter className="flex flex-col items-start gap-3 bg-muted/30">
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  Payment {lastResult.paymentIntentId}
                </p>
                <p className="text-xs text-muted-foreground">
                  Sent to {lastResult.recipients.map((recipient) => recipient.email).join(", ")}
                </p>
              </div>
              <div className="text-sm font-semibold">
                {formatCurrency(lastResult.amount, lastResult.currency, {
                  locale: intl?.locale,
                })}
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>
                Remaining balance{' '}
                {formatCurrency(lastResult.projectedBalance, lastResult.currency, {
                  locale: intl?.locale,
                })}
              </span>
              <span aria-hidden="true">•</span>
              <span>
                Allocated to {lastResult.allocations.length} charge{lastResult.allocations.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex w-full flex-wrap gap-2">
              {lastResult.allocations.map((allocation) => (
                <Badge key={allocation.chargeId} variant="outline">
                  {allocation.description}:{' '}
                  {formatCurrency(allocation.amount, lastResult.currency, {
                    locale: intl?.locale,
                  })}
                </Badge>
              ))}
            </div>
            {lastResult.note ? (
              <p className="w-full rounded-md bg-background/60 p-3 text-xs text-muted-foreground">
                Note: {lastResult.note}
              </p>
            ) : null}
          </CardFooter>
        </>
      ) : null}
    </Card>
  )
}
