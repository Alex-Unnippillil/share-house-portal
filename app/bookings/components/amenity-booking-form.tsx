"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import type { FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/utils/supabase-browser"
import { cn } from "@/lib/utils"

interface Amenity {
  id: string
  name: string
  description: string
  duration: string
  maxAdvance: string
}

export interface BookingShareDefaults {
  amenityId?: string
  start?: string
  end?: string
  summary?: string
  notes?: string
  sourceUrl?: string
}

type ConflictCode =
  | "INVALID_RANGE"
  | "PAST_START"
  | "TIME_OVERLAP"
  | "BUFFER_CONFLICT"

type ConflictSeverity = "error" | "warning"

interface ConflictEntry {
  code: ConflictCode
  severity: ConflictSeverity
  details: Record<string, unknown> | null
}

interface RpcPayload {
  conflicts?: unknown
  has_conflict?: unknown
}

const CONFLICT_TITLES: Record<ConflictCode, string> = {
  INVALID_RANGE: "Invalid time range",
  PAST_START: "Start time is in the past",
  TIME_OVERLAP: "Overlapping booking",
  BUFFER_CONFLICT: "Buffer window conflict",
}

const BUFFER_MINUTES = 15

function formatDateTimeLocal(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, "0")
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function toLocalInputValue(iso?: string) {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  return formatDateTimeLocal(date)
}

const displayFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

function formatForDisplay(value: unknown) {
  if (typeof value !== "string") return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return displayFormatter.format(date)
}

function toIsoString(value: string | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function normaliseConflicts(payload: RpcPayload): ConflictEntry[] {
  const conflicts = Array.isArray(payload.conflicts) ? payload.conflicts : []

  return conflicts
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null
      const record = entry as Record<string, unknown>
      const code = record.code
      const severity = record.severity
      const details = record.details

      if (
        (code === "INVALID_RANGE" ||
          code === "PAST_START" ||
          code === "TIME_OVERLAP" ||
          code === "BUFFER_CONFLICT") &&
        (severity === "error" || severity === "warning")
      ) {
        return {
          code,
          severity,
          details:
            details && typeof details === "object" ? (details as Record<string, unknown>) : null,
        }
      }

      return null
    })
    .filter((entry): entry is ConflictEntry => Boolean(entry))
}

export function AmenityBookingForm({
  amenity,
  shareDefaults,
}: {
  amenity: Amenity
  shareDefaults?: BookingShareDefaults
}) {
  const supabase = useMemo(() => createClient(), [])
  const applyShare =
    shareDefaults && (!shareDefaults.amenityId || shareDefaults.amenityId === amenity.id)
  const shareStartValue = applyShare ? toLocalInputValue(shareDefaults?.start) : undefined
  const shareEndValue = applyShare ? toLocalInputValue(shareDefaults?.end) : undefined

  const [startValue, setStartValue] = useState(() => {
    if (shareStartValue) return shareStartValue
    const now = new Date()
    const defaultStart = new Date(now.getTime() + 60 * 60 * 1000)
    return formatDateTimeLocal(defaultStart)
  })
  const [endValue, setEndValue] = useState(() => {
    if (shareEndValue) return shareEndValue
    const now = new Date()
    const defaultStart = new Date(now.getTime() + 60 * 60 * 1000)
    const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000)
    return formatDateTimeLocal(defaultEnd)
  })
  const [conflicts, setConflicts] = useState<ConflictEntry[]>([])
  const [status, setStatus] = useState<"idle" | "available" | "conflict" | "error">("idle")
  const [lastDuration, setLastDuration] = useState<number | null>(null)
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null)
  const [isPending, startTransition] = useTransition()

  const statusBadge = (() => {
    switch (status) {
      case "available":
        return <Badge variant="secondary">No conflicts</Badge>
      case "conflict":
        return <Badge variant="destructive">Conflicts detected</Badge>
      case "error":
        return <Badge variant="outline">Check failed</Badge>
      default:
        return <Badge variant="outline">Awaiting check</Badge>
    }
  })()

  useEffect(() => {
    if (!applyShare) return
    if (shareStartValue) setStartValue(shareStartValue)
    if (shareEndValue) setEndValue(shareEndValue)
  }, [applyShare, shareStartValue, shareEndValue])

  const shareSummary = applyShare ? shareDefaults?.summary ?? shareDefaults?.notes : undefined
  const shareSource = applyShare ? shareDefaults?.sourceUrl : undefined
  const showShareNotice = applyShare && (shareSummary || shareSource || shareStartValue || shareEndValue)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const startIso = toIsoString(startValue)
    const endIso = toIsoString(endValue)

    if (!startIso || !endIso) {
      toast.error("Please provide valid start and end times")
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

        console.info("[metrics] amenity_conflict_check", {
          amenityId: amenity.id,
          durationMs: Number(duration.toFixed(2)),
          within20ms: withinBudget,
          conflictCount: parsedConflicts.length,
        })

        if (error) {
          console.error("Failed to run amenity conflict check", error)
          toast.error("Unable to verify conflicts. Please try again.")
          setStatus("error")
          return
        }

        setConflicts(parsedConflicts)
        setStatus(parsedConflicts.length > 0 ? "conflict" : "available")

        if (parsedConflicts.length === 0) {
          toast.success(`Slot for ${amenity.name} looks clear!`)
        }
      } catch (rpcError) {
        console.error("Unexpected error during conflict check", rpcError)
        toast.error("Something went wrong while checking availability")
        setStatus("error")
      }
    })
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {showShareNotice && (
        <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 text-xs text-primary">
          <p className="font-medium text-sm">Imported from share</p>
          <p className="mt-1 text-primary/80">
            {shareSummary ?? 'Booking details'}
            {shareSource ? ` • ${shareSource}` : ''}
          </p>
        </div>
      )}

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {statusBadge}
          {isPending && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Checking…
            </span>
          )}
        </div>

        <Button disabled={isPending} type="submit">
          {isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Checking
            </span>
          ) : (
            "Check availability"
          )}
        </Button>
      </div>

      {conflicts.length > 0 && (
        <ul className="space-y-2" role="status" aria-live="polite">
          {conflicts.map((conflict, index) => {
            const details = conflict.details || {}
            const start = formatForDisplay(details.start_time)
            const end = formatForDisplay(details.end_time)

            const message = (() => {
              switch (conflict.code) {
                case "TIME_OVERLAP":
                  if (start && end) {
                    return `Overlaps with an existing booking from ${start} to ${end}.`
                  }
                  return "Overlaps with another confirmed booking."
                case "BUFFER_CONFLICT":
                  if (start && end) {
                    return `Needs a ${BUFFER_MINUTES}-minute buffer around a booking from ${start} to ${end}.`
                  }
                  return `Needs a ${BUFFER_MINUTES}-minute buffer before or after another booking.`
                case "PAST_START":
                  return "Start time must be in the future."
                case "INVALID_RANGE":
                  return "End time must be later than the start time."
                default:
                  return "Conflict detected."
              }
            })()

            const style =
              conflict.severity === "error"
                ? "border border-destructive/50 bg-destructive/10 text-destructive"
                : "border border-amber-200 bg-amber-50 text-amber-900"

            return (
              <li
                key={`${conflict.code}-${index}`}
                className={cn("rounded-md p-3 text-sm", style)}
              >
                <p className="font-medium">{CONFLICT_TITLES[conflict.code]}</p>
                <p>{message}</p>
              </li>
            )
          })}
        </ul>
      )}

      {status === "available" && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status" aria-live="polite">
          <p className="font-medium">All clear</p>
          <p>No conflicts detected for this time range.</p>
        </div>
      )}

      {lastDuration !== null && (
        <p className="text-xs text-muted-foreground">
          Response time: {lastDuration.toFixed(1)}ms
          {lastDuration <= 20 ? " • within 20ms budget" : " • exceeded 20ms budget"}
          {lastCheckedAt ? ` • Checked at ${displayFormatter.format(lastCheckedAt)}` : ""}
        </p>
      )}
    </form>
  )
}
