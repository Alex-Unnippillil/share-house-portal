"use client"

import { useEffect, useMemo, useRef, type ReactNode } from "react"
import Image from "next/image"
import { CalendarClock, Save, Trash2 } from "lucide-react"
import { useFormState, useFormStatus } from "react-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import type { SharedSpaceDiagram } from "@/lib/shared-space-maps"
import {
  deleteSharedSpaceMap,
  updateSharedSpaceMap,
  type SharedSpaceActionResult,
} from "../actions"

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "Unknown"
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function toDateInput(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ""
  }
  const iso = date.toISOString()
  return iso.slice(0, 16)
}

type FormState = SharedSpaceActionResult | { status: "idle" }

const initialState: FormState = { status: "idle" }

type DiagramManagerListProps = {
  diagrams: SharedSpaceDiagram[]
}

export function DiagramManagerList({ diagrams }: DiagramManagerListProps) {
  const sorted = useMemo(
    () => [...diagrams].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [diagrams]
  )

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/40 p-12 text-center">
        <h2 className="text-lg font-semibold">No shared space diagrams</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload a diagram to make it available to tenants and maintain an interactive overlay.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {sorted.map((diagram) => (
        <DiagramManagerCard key={diagram.id} diagram={diagram} />
      ))}
    </div>
  )
}

function DiagramManagerCard({ diagram }: { diagram: SharedSpaceDiagram }) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{diagram.title}</h3>
          <p className="text-sm text-muted-foreground">
            Lease {diagram.leaseId}
            {diagram.unitId ? ` • Unit ${diagram.unitId}` : null}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarClock className="size-4" aria-hidden /> Updated {formatDate(diagram.updatedAt)}
          </p>
        </div>
        <Badge variant="outline">{diagram.roomLabels.length} labels</Badge>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <UpdateDiagramForm diagram={diagram} />
        <DiagramDetailsPanel diagram={diagram} />
      </div>
    </div>
  )
}

function UpdateDiagramForm({ diagram }: { diagram: SharedSpaceDiagram }) {
  const [state, formAction] = useFormState(updateAction, initialState)
  const formRef = useRef<HTMLFormElement | null>(null)

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset()
    }
  }, [state])

  return (
    <form
      ref={formRef}
      action={formAction}
      encType="multipart/form-data"
      className="grid gap-4"
    >
      <input type="hidden" name="id" value={diagram.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`tenant-${diagram.id}`}>Tenant ID</Label>
          <Input
            id={`tenant-${diagram.id}`}
            name="tenantId"
            defaultValue={diagram.tenantId}
            placeholder="uuid"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`lease-${diagram.id}`}>Lease ID</Label>
          <Input
            id={`lease-${diagram.id}`}
            name="leaseId"
            defaultValue={diagram.leaseId}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`unit-${diagram.id}`}>Unit ID</Label>
          <Input id={`unit-${diagram.id}`} name="unitId" defaultValue={diagram.unitId ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`title-${diagram.id}`}>Title</Label>
          <Input id={`title-${diagram.id}`} name="title" defaultValue={diagram.title} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`bucket-${diagram.id}`}>Bucket</Label>
          <Input id={`bucket-${diagram.id}`} name="bucketId" placeholder="shared-space-maps" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`diagram-updated-${diagram.id}`}>Diagram last updated</Label>
          <Input
            id={`diagram-updated-${diagram.id}`}
            name="diagramUpdatedAt"
            type="datetime-local"
            defaultValue={toDateInput(diagram.diagramUpdatedAt)}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`description-${diagram.id}`}>Description</Label>
        <Textarea
          id={`description-${diagram.id}`}
          name="description"
          defaultValue={diagram.description ?? ""}
          rows={2}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`metadata-${diagram.id}`}>Metadata JSON</Label>
        <Textarea
          id={`metadata-${diagram.id}`}
          name="metadata"
          defaultValue={prettyPrint(diagram.metadata)}
          rows={3}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`labels-${diagram.id}`}>Room labels JSON</Label>
        <Textarea
          id={`labels-${diagram.id}`}
          name="roomLabels"
          defaultValue={prettyPrint(diagram.roomLabels)}
          rows={3}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`file-${diagram.id}`}>Replace file</Label>
        <Input id={`file-${diagram.id}`} name="file" type="file" accept="image/*,application/pdf" />
        <p className="text-xs text-muted-foreground">
          Uploading a new file will generate a fresh signed URL and update the diagram timestamp if not specified.
        </p>
      </div>
      <div className="flex items-center justify-between gap-4">
        <SubmitButton icon={<Save className="size-4" aria-hidden />} pendingText="Saving…">
          Save changes
        </SubmitButton>
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

function DiagramDetailsPanel({ diagram }: { diagram: SharedSpaceDiagram }) {
  return (
    <div className="space-y-4">
      <div className="relative h-48 w-full overflow-hidden rounded-md border bg-muted">
        {diagram.signedUrl ? (
          <Image
            src={diagram.signedUrl}
            alt={diagram.title}
            fill
            unoptimized
            sizes="(max-width: 1024px) 100vw, 360px"
            className="object-contain"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
            No preview available
          </div>
        )}
      </div>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="font-medium text-muted-foreground">Storage object</dt>
          <dd className="truncate">
            <code>{diagram.bucketId}/{diagram.filePath}</code>
          </dd>
        </div>
        <div>
          <dt className="font-medium text-muted-foreground">Diagram updated</dt>
          <dd>{formatDate(diagram.diagramUpdatedAt)}</dd>
        </div>
        {Object.entries(diagram.metadata).length > 0 ? (
          <div>
            <dt className="font-medium text-muted-foreground">Metadata summary</dt>
            <dd className="mt-1 space-y-1">
              {Object.entries(diagram.metadata).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-4 text-xs">
                  <span className="font-medium capitalize">{key.replace(/_/g, " ")}</span>
                  <span className="truncate">{stringifyValue(value)}</span>
                </div>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>
      <DeleteDiagramForm id={diagram.id} />
    </div>
  )
}

function DeleteDiagramForm({ id }: { id: string }) {
  const [state, formAction] = useFormState(deleteAction, initialState)
  const { pending } = useFormStatus()

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!confirm("Delete this diagram? This action cannot be undone.")) {
          event.preventDefault()
        }
      }}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        variant="destructive"
        disabled={pending}
        aria-disabled={pending}
        className="inline-flex items-center gap-2"
      >
        <Trash2 className="size-4" aria-hidden />
        {pending ? "Deleting…" : "Delete diagram"}
      </Button>
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
    </form>
  )
}

function SubmitButton({
  children,
  icon,
  pendingText,
}: {
  children: ReactNode
  icon: ReactNode
  pendingText: string
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="inline-flex items-center gap-2" disabled={pending} aria-disabled={pending}>
      {icon}
      {pending ? pendingText : children}
    </Button>
  )
}

function prettyPrint(value: unknown) {
  if (value === null || value === undefined) {
    return ""
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch (error) {
    return ""
  }
}

function stringifyValue(value: unknown) {
  if (value === null || value === undefined) {
    return ""
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  try {
    return JSON.stringify(value)
  } catch (error) {
    return ""
  }
}

const updateAction = async (_: FormState, formData: FormData) => updateSharedSpaceMap(formData)
const deleteAction = async (_: FormState, formData: FormData) => deleteSharedSpaceMap(formData)
