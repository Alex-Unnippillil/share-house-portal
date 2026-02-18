"use client"

import { useMemo, useState, useTransition } from "react"
import type { FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { track } from "@vercel/analytics"
import { ExternalLink, Loader2 } from "lucide-react"
import { toast } from "sonner"

import type { AmenityCatalogItem } from "@/lib/bookings/amenity-catalog"
import { buildCalEmbedUrl } from "@/lib/bookings/amenity-catalog"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

async function postOperationalMetric(metricName: string, tags: Record<string, unknown>) {
  try {
    await fetch("/api/ops/metrics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ metricName, tags }),
    })
  } catch (error) {
    console.error("Failed to post operational metric", error)
  }
}

function formatDateTimeLocal(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, "0")
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function toIsoString(value: string | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export function AmenityBookingForm({ amenity }: { amenity: AmenityCatalogItem }) {
  const [startValue, setStartValue] = useState(() => formatDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000)))
  const [endValue, setEndValue] = useState(() => formatDateTimeLocal(new Date(Date.now() + 2 * 60 * 60 * 1000)))
  const [allowRecurring, setAllowRecurring] = useState(false)
  const [frequency, setFrequency] = useState<"daily" | "weekly">("weekly")
  const [occurrences, setOccurrences] = useState(2)
  const [warnings, setWarnings] = useState<string[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [conflictCount, setConflictCount] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  const embedUrl = useMemo(() => {
    const url = new URL(buildCalEmbedUrl(amenity))
    if (startValue) {
      const startDate = new Date(startValue)
      if (!Number.isNaN(startDate.getTime())) {
        url.searchParams.set("date", startDate.toISOString().slice(0, 10))
      }
    }
    return url.toString()
  }, [amenity, startValue])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const startTime = toIsoString(startValue)
    const endTime = toIsoString(endValue)

    if (!startTime || !endTime) {
      toast.error("Please provide valid start and end time")
      return
    }

    startTransition(async () => {
      const startedAt = performance.now()
      try {
        const { data, error } = await supabase.rpc("check_amenity_conflicts", {
          p_amenity_id: amenity.id,
          p_start_time: startIso,
          p_end_time: endIso,
        })

        const duration = performance.now() - startedAt
        setLastDuration(duration)
        setLastCheckedAt(new Date())

        const parsedConflicts = normaliseConflicts((data ?? {}) as RpcPayload)
        const withinBudget = duration <= 20

        track("booking_conflict_check", {
      setErrors([])
      setWarnings([])

      const response = await fetch("/api/bookings/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amenityId: amenity.id,
          startTime,
          endTime,
          recurrence: {
            enabled: allowRecurring,
            frequency,
            count: allowRecurring ? occurrences : undefined,
          },
        }),
      })

      const payload = (await response.json()) as {
        ok?: boolean
        allowed?: boolean
        errors?: string[]
        warnings?: string[]
        conflicts?: unknown[]
      }

        if (parsedConflicts.length > 0) {
          track("booking_conflict_detected", {
            amenityId: amenity.id,
            conflictCount: parsedConflicts.length,
          })
          void postOperationalMetric("booking_conflicts_total", {
            amenityId: amenity.id,
            conflictCount: parsedConflicts.length,
          })
        }

        if (error) {
          console.error("Failed to run amenity conflict check", error)
          track("booking_conflict_check_failed", { amenityId: amenity.id })
          void postOperationalMetric("webhook_failures_total", {
            source: "booking_conflict_check",
            amenityId: amenity.id,
          })
          toast.error("Unable to verify conflicts. Please try again.")
          setStatus("error")
          return
        }
      if (!response.ok || !payload.ok) {
        toast.error("Unable to validate booking right now")
        return
      }

      setWarnings(payload.warnings ?? [])
      setErrors(payload.errors ?? [])
      setConflictCount(payload.conflicts?.length ?? 0)

        if (parsedConflicts.length === 0) {
          toast.success(`Slot for ${amenity.name} looks clear!`)
        }
      } catch (rpcError) {
        console.error("Unexpected error during conflict check", rpcError)
        track("booking_conflict_check_failed", { amenityId: amenity.id })
        void postOperationalMetric("webhook_failures_total", {
          source: "booking_conflict_check",
          amenityId: amenity.id,
        })
        toast.error("Something went wrong while checking availability")
        setStatus("error")
      if (!payload.allowed) {
        toast.error("Booking violates policy or conflicts with another reservation")
        return
      }

      toast.success("Validation passed. Complete this reservation in Cal.com below.")
    })
  }

  return (
    <div className="space-y-4">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${amenity.id}-start`}>Start time</Label>
            <Input
              id={`${amenity.id}-start`}
              type="datetime-local"
              value={startValue}
              onChange={(event) => setStartValue(event.target.value)}
              min={formatDateTimeLocal(new Date())}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${amenity.id}-end`}>End time</Label>
            <Input
              id={`${amenity.id}-end`}
              type="datetime-local"
              value={endValue}
              onChange={(event) => setEndValue(event.target.value)}
              min={startValue}
              required
            />
          </div>
        </div>

        <div className="space-y-3 rounded-md border p-3">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor={`${amenity.id}-recurring`} className="text-sm font-medium">
              Recurring reservation
            </Label>
            <Switch
              id={`${amenity.id}-recurring`}
              checked={allowRecurring}
              onCheckedChange={setAllowRecurring}
            />
          </div>

          {allowRecurring && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`${amenity.id}-frequency`}>Frequency</Label>
                <select
                  id={`${amenity.id}-frequency`}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={frequency}
                  onChange={(event) => setFrequency(event.target.value as "daily" | "weekly")}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${amenity.id}-occurrences`}>Occurrences</Label>
                <Input
                  id={`${amenity.id}-occurrences`}
                  type="number"
                  min={2}
                  max={amenity.maxRecurringOccurrences}
                  value={occurrences}
                  onChange={(event) => setOccurrences(Number(event.target.value || 2))}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">max {amenity.durationMinutes} min</Badge>
          <Badge variant="outline">advance {amenity.maxAdvanceDays} days</Badge>
          <Badge variant="outline">cancel ≥ {amenity.cancellationWindowHours}h before start</Badge>
        </div>

        <div className="flex items-center justify-between">
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Validating
              </span>
            ) : (
              "Validate booking"
            )}
          </Button>

          <a
            className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
            href={embedUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open in Cal.com <ExternalLink className="size-3" />
          </a>
        </div>

        {errors.length > 0 && (
          <ul className="space-y-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}

        {warnings.length > 0 && (
          <ul className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}

        {conflictCount !== null && (
          <p className="text-xs text-muted-foreground">
            {conflictCount === 0
              ? "No overlapping bookings found in local mirror."
              : `${conflictCount} overlapping booking(s) detected in local mirror.`}
          </p>
        )}
      </form>

      <iframe
        title={`${amenity.amenityName} booking embed`}
        src={embedUrl}
        className="h-[420px] w-full rounded-md border"
        loading="lazy"
      />
    </div>
  )
}
