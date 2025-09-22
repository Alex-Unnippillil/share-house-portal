"use client"

import { useMemo, useState } from "react"
import { format, parseISO } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  calculateLateFeeAmount,
  getAutopayScheduleWindow,
  getBillingPeriod,
} from "@/lib/payments/autopay"
import { formatCurrency } from "@/lib/payments/currency"
import type {
  AutopayScheduleConfig,
  AutopayStatus,
} from "@/types/payments"

const autopayStatusCopy: Record<
  AutopayStatus,
  { label: string; variant: "complete" | "secondary" | "outline" }
> = {
  active: { label: "Autopay active", variant: "complete" },
  paused: { label: "Autopay paused", variant: "secondary" },
  disabled: { label: "Autopay off", variant: "outline" },
}

const dueDayOptions = Array.from({ length: 28 }, (_, index) => index + 1)
const autopayLeadOptions = [0, 1, 2, 3, 5, 7]
const graceOptions = [0, 1, 2, 3, 4, 5, 7]

type AutopayScheduleCardProps = {
  schedule: AutopayScheduleConfig
}

type AutopayFormState = {
  dueDay: number
  autopayLeadDays: number
  gracePeriodDays: number
  lateFeeMode: "flat" | "percentage"
  lateFeeValue: string
  lateFeeCap: string
}

function formatTimeOfDay(time: string, timezone: string): string {
  const [hoursString, minutesString] = time.split(":")
  const hours = Number.parseInt(hoursString ?? "0", 10)
  const minutes = Number.parseInt(minutesString ?? "0", 10)
  const baseDate = new Date()
  baseDate.setHours(hours, minutes, 0, 0)

  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    }).format(baseDate)
  } catch {
    return `${time} ${timezone}`
  }
}

function getTimezoneAbbreviation(timezone: string, reference: Date): string {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      timeZoneName: "short",
    }).formatToParts(reference)
    const timeZoneNamePart = parts.find((part) => part.type === "timeZoneName")
    return timeZoneNamePart?.value ?? timezone
  } catch {
    return timezone
  }
}

function safeFormatDate(value: string, pattern: string): string {
  if (!value) {
    return "—"
  }

  const parsed = parseISO(value)
  if (Number.isNaN(parsed.getTime())) {
    return "—"
  }

  try {
    return format(parsed, pattern)
  } catch {
    return "—"
  }
}

function describeLateFee(
  rule: AutopayScheduleConfig["settings"]["lateFee"],
  projectedLateFee: number,
  currency: string,
): string {
  if (rule.mode === "flat") {
    return `${formatCurrency(rule.amount, currency)} flat fee`
  }

  if (typeof rule.cap === "number") {
    return `${formatCurrency(projectedLateFee, currency)} (${rule.percentage}% · capped at ${formatCurrency(rule.cap, currency)})`
  }

  return `${formatCurrency(projectedLateFee, currency)} (${rule.percentage}% of rent)`
}

export function AutoPayScheduleCard({ schedule }: AutopayScheduleCardProps) {
  const initialLateFee = schedule.settings.lateFee
  const initialLateFeeMode = initialLateFee.mode
  const initialLateFeeValue =
    initialLateFeeMode === "flat"
      ? initialLateFee.amount.toString()
      : initialLateFee.percentage.toString()
  const initialLateFeeCap =
    initialLateFeeMode === "percentage" && typeof initialLateFee.cap === "number"
      ? initialLateFee.cap.toString()
      : ""

  const [enabled, setEnabled] = useState(schedule.autopayEnabled)
  const [formState, setFormState] = useState<AutopayFormState>({
    dueDay: schedule.settings.dueDay,
    autopayLeadDays: schedule.settings.autopayLeadDays,
    gracePeriodDays: schedule.settings.gracePeriodDays,
    lateFeeMode: initialLateFeeMode,
    lateFeeValue: initialLateFeeValue,
    lateFeeCap: initialLateFeeCap,
  })
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  const computed = useMemo(() => {
    const parsedValue = Number.parseFloat(formState.lateFeeValue)
    const safeValue = Number.isFinite(parsedValue) ? parsedValue : 0
    const parsedCap = Number.parseFloat(formState.lateFeeCap)
    const safeCap = Number.isFinite(parsedCap) ? parsedCap : undefined

    const lateFee =
      formState.lateFeeMode === "flat"
        ? { mode: "flat" as const, amount: safeValue }
        : { mode: "percentage" as const, percentage: safeValue, cap: safeCap }

    const updatedSchedule: AutopayScheduleConfig = {
      ...schedule,
      autopayEnabled: enabled,
      settings: {
        ...schedule.settings,
        dueDay: formState.dueDay,
        autopayLeadDays: formState.autopayLeadDays,
        gracePeriodDays: formState.gracePeriodDays,
        lateFee,
      },
    }

    return {
      schedule: updatedSchedule,
      window: getAutopayScheduleWindow(updatedSchedule),
      billingPeriod: getBillingPeriod(updatedSchedule),
      projectedLateFee: calculateLateFeeAmount(updatedSchedule),
    }
  }, [enabled, formState, schedule])

  const autopayTimeLabel = useMemo(
    () => formatTimeOfDay(schedule.settings.autopayTime, schedule.settings.timezone),
    [schedule.settings.autopayTime, schedule.settings.timezone],
  )

  const timezoneLabel = useMemo(
    () => getTimezoneAbbreviation(schedule.settings.timezone, computed.window.autopayDate),
    [computed.window.autopayDate, schedule.settings.timezone],
  )

  const autopayLeadCopy =
    formState.autopayLeadDays === 0
      ? "on the due date"
      : `${formState.autopayLeadDays} day${formState.autopayLeadDays === 1 ? "" : "s"} before rent is due`

  const coverage = useMemo(() => {
    const breakdown = computed.schedule.participants.reduce<
      Record<AutopayStatus, number>
    >(
      (accumulator, participant) => {
        accumulator[participant.autopayStatus] += 1
        return accumulator
      },
      { active: 0, paused: 0, disabled: 0 },
    )

    const total = computed.schedule.participants.length
    const percentage = total > 0 ? Math.round((breakdown.active / total) * 100) : 0

    return { ...breakdown, total, percentage }
  }, [computed.schedule.participants])

  const retryWindowLabel = format(computed.window.retryWindowEnd, "MMM d")
  const billingWindowLabel = `${format(computed.billingPeriod.start, "MMM d")} – ${format(
    computed.billingPeriod.end,
    "MMM d",
  )}`

  const nextAutopayPrimary = enabled
    ? format(computed.window.autopayDate, "MMM d")
    : "Autopay disabled"
  const nextAutopaySecondary = enabled
    ? `Runs at ${autopayTimeLabel} ${timezoneLabel} (${autopayLeadCopy})`
    : "Turn on AutoPay to draft rent before the due date."

  const lastRunDate = safeFormatDate(computed.schedule.lastRun.processedAt, "MMM d, yyyy")
  const lastRunStatusCopy: Record<
    AutopayScheduleConfig["lastRun"]["status"],
    string
  > = {
    succeeded: "Succeeded",
    partial: "Partial",
    failed: "Failed",
  }

  const handleSave = () => {
    setLastSavedAt(new Date())
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AutoPay schedule</CardTitle>
        <CardDescription>
          Configure recurring rent collection, grace periods, and late fee automation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-xs uppercase text-muted-foreground">Next AutoPay</p>
            <p className="text-base font-semibold">{nextAutopayPrimary}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {enabled ? `${nextAutopaySecondary} · Retries through ${retryWindowLabel}` : nextAutopaySecondary}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-xs uppercase text-muted-foreground">Rent due</p>
            <p className="text-base font-semibold">
              {format(computed.window.dueDate, "MMM d")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Billing window {billingWindowLabel}</p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-xs uppercase text-muted-foreground">Grace period</p>
            <p className="text-base font-semibold">
              {formState.gracePeriodDays} day{formState.gracePeriodDays === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Late fee posts {format(computed.window.lateFeeDate, "MMM d")}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-xs uppercase text-muted-foreground">Late fee</p>
            <p className="text-base font-semibold">
              {describeLateFee(
                computed.schedule.settings.lateFee,
                computed.projectedLateFee,
                computed.schedule.currency,
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Applies if unpaid after grace window
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Enable AutoPay</p>
              <p className="text-xs text-muted-foreground">
                Automatically draft roommate shares before the due date.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Rent due day</Label>
              <Select
                value={formState.dueDay.toString()}
                onValueChange={(value) =>
                  setFormState((previous) => ({
                    ...previous,
                    dueDay: Number.parseInt(value, 10),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select due day" />
                </SelectTrigger>
                <SelectContent>
                  {dueDayOptions.map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Applies to every monthly billing cycle
              </p>
            </div>
            <div className="space-y-2">
              <Label>AutoPay lead time</Label>
              <Select
                value={formState.autopayLeadDays.toString()}
                onValueChange={(value) =>
                  setFormState((previous) => ({
                    ...previous,
                    autopayLeadDays: Number.parseInt(value, 10),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select lead time" />
                </SelectTrigger>
                <SelectContent>
                  {autopayLeadOptions.map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day === 0
                        ? "Same day"
                        : `${day} day${day === 1 ? "" : "s"} before due date`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Draft payments {autopayLeadCopy}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Grace period (days)</Label>
              <Select
                value={formState.gracePeriodDays.toString()}
                onValueChange={(value) =>
                  setFormState((previous) => ({
                    ...previous,
                    gracePeriodDays: Number.parseInt(value, 10),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select grace period" />
                </SelectTrigger>
                <SelectContent>
                  {graceOptions.map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day === 0 ? "No grace" : `${day} day${day === 1 ? "" : "s"}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Late fees begin after this many extra days
              </p>
            </div>
            <div className="space-y-2">
              <Label>Late fee type</Label>
              <Select
                value={formState.lateFeeMode}
                onValueChange={(value) =>
                  setFormState((previous) => ({
                    ...previous,
                    lateFeeMode: value as "flat" | "percentage",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fee type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat amount</SelectItem>
                  <SelectItem value="percentage">Percentage of rent</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose how late fees are calculated
              </p>
            </div>
            <div className="space-y-2">
              <Label>
                {formState.lateFeeMode === "percentage"
                  ? "Late fee percentage"
                  : "Late fee amount"}
              </Label>
              <Input
                inputMode="decimal"
                min={0}
                step={formState.lateFeeMode === "percentage" ? "0.1" : "1"}
                type="number"
                value={formState.lateFeeValue}
                onChange={(event) =>
                  setFormState((previous) => ({
                    ...previous,
                    lateFeeValue: event.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                {formState.lateFeeMode === "percentage"
                  ? "Percentage of the monthly rent share"
                  : "Flat amount assessed when payment is late"}
              </p>
            </div>
            {formState.lateFeeMode === "percentage" ? (
              <div className="space-y-2">
                <Label>Maximum late fee (optional)</Label>
                <Input
                  inputMode="decimal"
                  min={0}
                  step="1"
                  type="number"
                  value={formState.lateFeeCap}
                  onChange={(event) =>
                    setFormState((previous) => ({
                      ...previous,
                      lateFeeCap: event.target.value,
                    }))
                  }
                  placeholder="No cap"
                />
                <p className="text-xs text-muted-foreground">
                  Cap the percentage-based fee at a set amount
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Roommate coverage</p>
              <p className="text-xs text-muted-foreground">
                {coverage.total > 0
                  ? `${coverage.active}/${coverage.total} roommates on AutoPay · ${coverage.percentage}% coverage`
                  : "No roommates have enabled AutoPay yet."}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {computed.schedule.participants.map((participant) => (
              <div
                key={participant.roommateId}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-muted/30 p-3"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{participant.roommateName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(participant.rentShare, computed.schedule.currency)} · {participant.paymentMethod}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last payment {safeFormatDate(participant.lastPaymentDate, "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={autopayStatusCopy[participant.autopayStatus].variant}>
                    {autopayStatusCopy[participant.autopayStatus].label}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Share {formatCurrency(participant.rentShare, computed.schedule.currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">
          <span>
            Last run {lastRunDate} · {lastRunStatusCopy[computed.schedule.lastRun.status]} · {formatCurrency(
              computed.schedule.lastRun.totalCollected,
              computed.schedule.currency,
            )} collected
          </span>
          {lastSavedAt ? (
            <span className="block sm:ml-2 sm:inline">
              Draft saved {format(lastSavedAt, "MMM d, yyyy h:mm a")}
            </span>
          ) : null}
        </div>
        <Button type="button" onClick={handleSave}>
          Save schedule
        </Button>
      </CardFooter>
    </Card>
  )
}
