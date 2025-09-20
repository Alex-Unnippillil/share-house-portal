"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { useFormState, useFormStatus } from "react-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import {
  createSharedSpaceMap,
  type SharedSpaceActionResult,
} from "../actions"

const initialState: SharedSpaceActionResult | { status: "idle" } = { status: "idle" }

type FormState = SharedSpaceActionResult | { status: "idle" }

async function createSharedSpaceMapAction(_: FormState, formData: FormData) {
  return createSharedSpaceMap(formData)
}

function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? "Uploading…" : children}
    </Button>
  )
}

export function CreateDiagramForm() {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [state, action] = useFormState(createSharedSpaceMapAction, initialState)

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset()
    }
  }, [state])

  return (
    <form
      ref={formRef}
      action={action}
      encType="multipart/form-data"
      className="grid gap-4 rounded-lg border bg-card p-6 shadow-sm"
    >
      <div>
        <h2 className="text-lg font-semibold">Upload new diagram</h2>
        <p className="text-sm text-muted-foreground">
          Provide tenant and lease identifiers, upload a diagram file, and optionally include metadata to
          power overlay labels in the tenant portal.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="tenantId">Tenant ID</Label>
          <Input id="tenantId" name="tenantId" placeholder="uuid" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="leaseId">Lease ID</Label>
          <Input id="leaseId" name="leaseId" placeholder="Lease identifier" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="unitId">Unit ID (optional)</Label>
          <Input id="unitId" name="unitId" placeholder="Unit identifier" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="title">Diagram title</Label>
          <Input id="title" name="title" placeholder="Shared kitchen layout" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="bucketId">Storage bucket (optional)</Label>
          <Input id="bucketId" name="bucketId" placeholder="shared-space-maps" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="diagramUpdatedAt">Diagram last updated</Label>
          <Input id="diagramUpdatedAt" name="diagramUpdatedAt" type="datetime-local" />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Short context for teammates"
          rows={2}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="metadata">Metadata JSON</Label>
        <Textarea
          id="metadata"
          name="metadata"
          placeholder='{"notes":"Include recycling bins","access":"Residents only"}'
          rows={3}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="roomLabels">Room labels JSON</Label>
        <Textarea
          id="roomLabels"
          name="roomLabels"
          placeholder='[{"title":"Kitchen","x":0.32,"y":0.58}]'
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Provide an array of label objects with normalized <code>x</code> and <code>y</code> coordinates between 0
          and 1. Optional keys such as <code>description</code> and nested metadata are supported.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="file">Diagram file</Label>
        <Input id="file" name="file" type="file" accept="image/*,application/pdf" required />
      </div>
      <div className="flex items-center justify-between gap-4">
        <SubmitButton>Upload diagram</SubmitButton>
        {state.status !== "idle" ? (
          <p
            className={cn(
              "text-sm",
              state.status === "error" ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  )
}
