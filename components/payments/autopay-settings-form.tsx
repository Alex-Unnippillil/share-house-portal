"use client"

import { useEffect, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { useForm } from "react-hook-form"

import { saveAutoPaySettings } from "@/app/payments/actions"
import {
  autopayFormSchema,
  type AutopayFormValues,
} from "@/lib/payments/autopay-schema"
import {
  calculateNextDueDate,
  type RentPaymentScheduleRow,
} from "@/lib/payments/autopay-scheduler"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

const timezoneOptions = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Australia/Sydney",
]

const defaultScheduleValues = (): AutopayFormValues => {
  const today = new Date()
  const defaultDay = 1
  const anchor = new Date(today.getFullYear(), today.getMonth(), defaultDay)
  const firstChargeDate = calculateNextDueDate(defaultDay, today, anchor)

  return {
    rentAmount: 2500,
    currency: "USD",
    dayOfMonth: defaultDay,
    firstChargeDate,
    timezone: "UTC",
    gracePeriodDays: 3,
    autopayEnabled: true,
    lateFeeType: "flat",
    lateFeeFlat: 50,
    lateFeePercent: undefined,
    lateFeeCap: undefined,
  }
}

function scheduleToFormValues(schedule: RentPaymentScheduleRow): AutopayFormValues {
  const firstChargeDate = new Date(schedule.anchor_date)

  return {
    rentAmount: schedule.rent_amount_cents / 100,
    currency: schedule.currency,
    dayOfMonth: schedule.day_of_month,
    firstChargeDate,
    timezone: schedule.timezone,
    gracePeriodDays: schedule.grace_period_days,
    autopayEnabled: schedule.autopay_enabled,
    lateFeeType: schedule.late_fee_type as AutopayFormValues["lateFeeType"],
    lateFeeFlat:
      schedule.late_fee_type === "flat"
        ? (schedule.late_fee_flat_cents ?? 0) / 100
        : undefined,
    lateFeePercent:
      schedule.late_fee_type === "percentage" ? schedule.late_fee_percent ?? 0 : undefined,
    lateFeeCap: schedule.late_fee_cap_cents != null ? schedule.late_fee_cap_cents / 100 : undefined,
  }
}

export interface AutoPaySettingsFormProps {
  schedule?: RentPaymentScheduleRow | null
}

export function AutoPaySettingsForm({ schedule }: AutoPaySettingsFormProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const form = useForm<AutopayFormValues>({
    resolver: zodResolver(autopayFormSchema),
    defaultValues: schedule ? scheduleToFormValues(schedule) : defaultScheduleValues(),
  })

  useEffect(() => {
    if (schedule) {
      form.reset(scheduleToFormValues(schedule))
    }
  }, [schedule, form])

  const selectedLateFeeType = form.watch("lateFeeType")

  const handleSubmit = (values: AutopayFormValues) => {
    startTransition(async () => {
      const result = await saveAutoPaySettings(values)

      if (result.success) {
        toast({
          title: "AutoPay saved",
          description: result.message,
        })
        form.reset(values)
      } else {
        if (result.errors) {
          for (const [field, messages] of Object.entries(result.errors)) {
            form.setError(field as keyof AutopayFormValues, {
              type: "server",
              message: messages?.join(" ") ?? result.message,
            })
          }
        }
        toast({
          title: "Unable to save AutoPay",
          description: result.message,
          variant: "destructive",
        })
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="rentAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly rent</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    inputMode="decimal"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(event) => {
                      const value = event.target.value
                      field.onChange(value === "" ? undefined : Number(value))
                    }}
                  />
                </FormControl>
                <FormDescription>Amount collected for the entire unit each billing cycle.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="AUD">AUD</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>Currency used for Stripe payouts and invoices.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dayOfMonth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due date</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={String(field.value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select due date" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                      <SelectItem key={day} value={String(day)}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>The day of the month the rent is charged.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="firstChargeDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>First charge date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? format(field.value, "PPP") : "Select a date"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => field.onChange(date ?? field.value)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>Anchor date used to generate recurring rent charges.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Timezone</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-64">
                    {timezoneOptions.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Stripe will run AutoPay using this timezone.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gracePeriodDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Grace period (days)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    {...field}
                    value={field.value ?? ""}
                    onChange={(event) => {
                      const value = event.target.value
                      field.onChange(value === "" ? undefined : Number(value))
                    }}
                  />
                </FormControl>
                <FormDescription>Days after the due date before late fees are calculated.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <FormLabel className="text-base">Automatic payments</FormLabel>
              <p className="text-sm text-muted-foreground">
                Toggle AutoPay to automatically charge the stored payment method on the due date.
              </p>
            </div>
            <FormField
              control={form.control}
              name="autopayEnabled"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-border p-4">
          <FormField
            control={form.control}
            name="lateFeeType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Late fee calculation</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select late fee type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="flat">Flat amount</SelectItem>
                    <SelectItem value="percentage">Percentage of rent</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>Automatically applied when rent remains unpaid after the grace period.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {selectedLateFeeType === "flat" ? (
            <FormField
              control={form.control}
              name="lateFeeFlat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Flat late fee</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      {...field}
                      value={field.value ?? ""}
                      onChange={(event) => {
                        const value = event.target.value
                        field.onChange(value === "" ? undefined : Number(value))
                      }}
                    />
                  </FormControl>
                  <FormDescription>Charged once when the grace period expires.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="lateFeePercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Late fee percentage</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      min={0}
                      max={100}
                      {...field}
                      value={field.value ?? ""}
                      onChange={(event) => {
                        const value = event.target.value
                        field.onChange(value === "" ? undefined : Number(value))
                      }}
                    />
                  </FormControl>
                  <FormDescription>Percentage of the rent amount charged after the grace period.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="lateFeeCap"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Late fee cap (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    {...field}
                    value={field.value ?? ""}
                    onChange={(event) => {
                      const value = event.target.value
                      field.onChange(value === "" ? undefined : Number(value))
                    }}
                  />
                </FormControl>
                <FormDescription>Maximum total late fee charged for a single billing cycle.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save AutoPay settings"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
