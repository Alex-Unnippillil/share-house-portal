"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useFormState, useFormStatus } from "react-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import { uploadFloorplan, type FloorplanUploadState } from "./actions"

type HouseholdOption = {
  id: string
  name: string | null
  slug: string | null
}

const initialState: FloorplanUploadState = {
  status: "idle",
}

export function FloorplanUploadForm({ households }: { households: HouseholdOption[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction] = useFormState(uploadFloorplan, initialState)
  const [householdId, setHouseholdId] = useState(households[0]?.id ?? "")

  useEffect(() => {
    if (!householdId && households.length > 0) {
      setHouseholdId(households[0].id)
    }
  }, [householdId, households])

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset()
      setHouseholdId(households[0]?.id ?? "")
    }
  }, [state.status, households])

  const selectedHouseholdOption = useMemo(() => {
    return households.find((household) => household.id === householdId) ?? null
  }, [householdId, households])

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-6 rounded-lg border bg-card p-6 shadow-sm"
    >
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Upload a new floorplan</h2>
        <p className="text-sm text-muted-foreground">
          Floorplans are stored in the Supabase <code className="rounded bg-muted px-1 py-0.5">floorplans</code> bucket.
          Supply pixel dimensions and optional overlay metadata to unlock roommate-specific views.
        </p>
      </div>

      <fieldset className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="e.g. Unit 2A Main Level" required />
          {state.fieldErrors?.name && (
            <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Input id="description" name="description" placeholder="Highlight storage zones or unique notes" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="width">Width (px)</Label>
          <Input id="width" name="width" type="number" min={1} step={1} placeholder="1200" required />
          {state.fieldErrors?.width && (
            <p className="text-xs text-destructive">{state.fieldErrors.width}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="height">Height (px)</Label>
          <Input id="height" name="height" type="number" min={1} step={1} placeholder="900" required />
          {state.fieldErrors?.height && (
            <p className="text-xs text-destructive">{state.fieldErrors.height}</p>
          )}
        </div>
      </fieldset>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Household</Label>
          {households.length > 0 ? (
            <Select
              value={selectedHouseholdOption ? selectedHouseholdOption.id : undefined}
              onValueChange={(value) => setHouseholdId(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a household" />
              </SelectTrigger>
              <SelectContent>
                {households.map((household) => (
                  <SelectItem key={household.id} value={household.id}>
                    {household.name ?? household.slug ?? household.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 p-3 text-sm text-muted-foreground">
              No households were found. Paste a valid household identifier below to associate this floorplan.
            </p>
          )}
          <Input
            id="householdId"
            name="householdId"
            value={householdId}
            onChange={(event) => setHouseholdId(event.target.value)}
            placeholder="Paste or type a household UUID"
            required
          />
          <p className="text-xs text-muted-foreground">
            {households.length > 0
              ? "Select a household from the list or override it with a specific UUID."
              : "Enter the UUID of the household that should see this floorplan."}
          </p>
          {state.fieldErrors?.householdId && (
            <p className="text-xs text-destructive">{state.fieldErrors.householdId}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="file">Floorplan image</Label>
          <Input id="file" name="file" type="file" accept="image/*" required />
          <p className="text-xs text-muted-foreground">
            Upload a high-resolution PNG, JPEG, or SVG. Files up to 10MB are supported.
          </p>
          {state.fieldErrors?.file && (
            <p className="text-xs text-destructive">{state.fieldErrors.file}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="overlays">Overlay JSON (optional)</Label>
        <Textarea
          id="overlays"
          name="overlays"
          placeholder='[
  {"id":"kitchen","label":"Kitchen","x":64,"y":48,"width":320,"height":280,"color":"#2563eb4d"}
]'
          className="min-h-[160px] font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          Provide an array of overlay objects with <code>id</code>, <code>label</code>, <code>x</code>, <code>y</code>,
          <code>width</code>, and <code>height</code> fields to highlight zones on the tenant view. Colors and notes are optional.
        </p>
        {state.fieldErrors?.overlays && (
          <p className="text-xs text-destructive">{state.fieldErrors.overlays}</p>
        )}
      </div>

      <StatusMessage state={state} />

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Tip: use consistent pixel dimensions so overlays scale correctly across devices.
        </p>
        <SubmitButton />
      </div>
    </form>
  )
}

function StatusMessage({ state }: { state: FloorplanUploadState }) {
  if (state.status === "idle") {
    return null
  }

  const variant = state.status === "success" ? "bg-emerald-600/10 text-emerald-600" : "bg-destructive/10 text-destructive"

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={cn("rounded-md px-3 py-2 text-sm", variant)}
    >
      {state.message}
    </div>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="min-w-[180px]">
      {pending ? "Uploading…" : "Upload floorplan"}
    </Button>
  )
}
