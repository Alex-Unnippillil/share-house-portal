"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useFormState } from "react-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatQuietHoursWindow, isDateWithinQuietHours } from "@/lib/quiet-hours"
import type { QuietHoursSettings } from "@/lib/quiet-hours"

import {
  initialVisitorRequestState,
  submitVisitorRequest,
  type VisitorRequestState,
} from "./actions"

type VisitorRequestFormProps = {
  settings: QuietHoursSettings
}

export function VisitorRequestForm({ settings }: VisitorRequestFormProps) {
  const [state, formAction] = useFormState(submitVisitorRequest, initialVisitorRequestState)
  const [arrival, setArrival] = useState("")
  const [departure, setDeparture] = useState("")
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset()
      setArrival("")
      setDeparture("")
    }
  }, [state.status])

  const quietHoursWindow = useMemo(() => formatQuietHoursWindow(settings), [settings])

  const { arrivalConflict, departureConflict, hasConflict } = useMemo(() => {
    const arrivalDate = arrival ? new Date(arrival) : null
    const departureDate = departure ? new Date(departure) : null

    const arrivalConflict = arrivalDate
      ? isDateWithinQuietHours(arrivalDate, settings)
      : false
    const departureConflict = departureDate
      ? isDateWithinQuietHours(departureDate, settings)
      : false

    return {
      arrivalConflict,
      departureConflict,
      hasConflict: arrivalConflict || departureConflict,
    }
  }, [arrival, departure, settings])

  const renderFeedback = (formState: VisitorRequestState) => {
    if (!formState.message) {
      return null
    }

    const tone = formState.status === "success" ? "success" : "error"
    const baseStyles =
      tone === "success"
        ? "border-green-500/40 bg-green-500/10 text-green-900 dark:text-green-200"
        : "border-red-500/50 bg-red-500/10 text-red-900 dark:text-red-200"

    return (
      <div className={`rounded-md border px-4 py-3 text-sm ${baseStyles}`}>
        <p>{formState.message}</p>
        {formState.policyMessage && (
          <p className="mt-1 text-xs opacity-80">{formState.policyMessage}</p>
        )}
      </div>
    )
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="visitorName">Visitor name</Label>
        <Input
          id="visitorName"
          name="visitorName"
          placeholder="Who is staying over?"
          required
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="arrivalAt">Arrival</Label>
          <Input
            id="arrivalAt"
            name="arrivalAt"
            type="datetime-local"
            onChange={(event) => setArrival(event.target.value)}
            required
          />
          {arrivalConflict && (
            <p className="text-xs text-amber-600">Arrival overlaps quiet hours.</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="departureAt">Departure</Label>
          <Input
            id="departureAt"
            name="departureAt"
            type="datetime-local"
            onChange={(event) => setDeparture(event.target.value)}
            required
          />
          {departureConflict && (
            <p className="text-xs text-amber-600">Departure overlaps quiet hours.</p>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="reason">Visit notes (optional)</Label>
        <Textarea
          id="reason"
          name="reason"
          placeholder="Share the reason or any helpful notes for your roommates."
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Quiet hours run {quietHoursWindow}. Arrivals and departures should stay outside
          this window.
        </p>
      </div>
      {hasConflict && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          <p>
            Your selected times overlap with quiet hours. Adjust the schedule or share an
            alternate hand-off plan before submitting.
          </p>
          <p className="mt-1 text-xs opacity-80">{settings.policy_message}</p>
        </div>
      )}
      {renderFeedback(state)}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={hasConflict}>
          Submit visitor request
        </Button>
        {hasConflict && (
          <p className="text-xs text-muted-foreground">
            Update times outside quiet hours to enable submission.
          </p>
        )}
      </div>
    </form>
  )
}
