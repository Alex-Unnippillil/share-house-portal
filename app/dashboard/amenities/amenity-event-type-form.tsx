"use client"

import { useFormState, useFormStatus } from "react-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import type { AmenityEventTypeState } from "./actions"
import { updateAmenityEventType } from "./actions"

type AmenityEventTypeFormProps = {
  amenityId: number
  defaultEventTypeId: number | null
  defaultEventTypeSlug: string | null
}

const initialState: AmenityEventTypeState = { status: "idle" }

export function AmenityEventTypeForm({
  amenityId,
  defaultEventTypeId,
  defaultEventTypeSlug,
}: AmenityEventTypeFormProps) {
  const [state, formAction] = useFormState(updateAmenityEventType, initialState)

  return (
    <form action={formAction} className="space-y-2">
      <input name="id" type="hidden" value={amenityId} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          name="calcom_event_type_id"
          defaultValue={defaultEventTypeId ? String(defaultEventTypeId) : ""}
          placeholder="Cal.com event type ID"
          inputMode="numeric"
          className="sm:max-w-[160px]"
        />
        <Input
          name="calcom_event_type_slug"
          defaultValue={defaultEventTypeSlug ?? ""}
          placeholder="Cal.com event type slug"
          className="sm:max-w-[220px]"
        />
        <SubmitButton />
      </div>
      {state.status === "error" ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
      {state.status === "success" ? (
        <p className="text-sm text-muted-foreground">{state.message}</p>
      ) : null}
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} isLoading={pending}>
      Save
    </Button>
  )
}
