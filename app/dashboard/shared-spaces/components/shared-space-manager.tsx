'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { useFormState, useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import {
  deleteSharedSpaceMap,
  updateSharedSpaceMap,
  type StaffActionResult,
  type StaffSharedSpaceDiagram,
} from '../actions'

const initialState: StaffActionResult | null = null

export function SharedSpaceManagerList({ diagrams }: { diagrams: StaffSharedSpaceDiagram[] }) {
  if (!diagrams.length) {
    return null
  }

  return (
    <div className="grid gap-6">
      {diagrams.map((diagram) => (
        <EditSharedSpaceCard key={diagram.id} diagram={diagram} />
      ))}
    </div>
  )
}

function EditSharedSpaceCard({ diagram }: { diagram: StaffSharedSpaceDiagram }) {
  const metadataString = useMemo(
    () => JSON.stringify(diagram.metadata, null, 2),
    [diagram.metadata]
  )
  const [state, formAction] = useFormState(updateSharedSpaceMap, initialState)

  const updatedText = useMemo(() => {
    try {
      return formatDistanceToNow(parseISO(diagram.updatedAt), { addSuffix: true })
    } catch (error) {
      return null
    }
  }, [diagram.updatedAt])

  const uploadedText = useMemo(() => {
    try {
      return formatDistanceToNow(parseISO(diagram.lastUploadedAt), { addSuffix: true })
    } catch (error) {
      return null
    }
  }, [diagram.lastUploadedAt])

  return (
    <div className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold">{diagram.title ?? 'Untitled diagram'}</h3>
          <p className="text-sm text-muted-foreground">
            Lease {diagram.leaseId}
            {diagram.unitId ? <> · Unit {diagram.unitId}</> : null}
          </p>
        </div>
        <div className="text-xs text-muted-foreground sm:text-sm">
          {updatedText ? <p>Updated {updatedText}</p> : null}
          {uploadedText ? <p>File refreshed {uploadedText}</p> : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
          <Image
            src={diagram.signedUrl}
            alt={diagram.title ?? 'Shared space preview'}
            fill
            sizes="320px"
            className="object-cover"
          />
        </div>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={diagram.id} />
          <div className="grid gap-4 md:grid-cols-2">
            <Field id={`lease-${diagram.id}`} label="Lease ID">
              <Input
                id={`lease-${diagram.id}`}
                name="leaseId"
                defaultValue={diagram.leaseId}
                placeholder="Lease identifier"
              />
            </Field>
            <Field id={`unit-${diagram.id}`} label="Unit ID">
              <Input
                id={`unit-${diagram.id}`}
                name="unitId"
                defaultValue={diagram.unitId ?? ''}
                placeholder="Unit identifier"
              />
            </Field>
            <Field id={`tenant-${diagram.id}`} label="Tenant profile ID">
              <Input
                id={`tenant-${diagram.id}`}
                name="tenantId"
                defaultValue={diagram.tenantId}
                placeholder="Tenant profile UUID"
              />
            </Field>
            <Field id={`title-${diagram.id}`} label="Title">
              <Input
                id={`title-${diagram.id}`}
                name="title"
                defaultValue={diagram.title ?? ''}
                placeholder="Diagram title"
              />
            </Field>
          </div>

          <Field id={`description-${diagram.id}`} label="Description">
            <Textarea
              id={`description-${diagram.id}`}
              name="description"
              defaultValue={diagram.description ?? ''}
              rows={3}
            />
          </Field>

          <Field id={`metadata-${diagram.id}`} label="Metadata JSON">
            <Textarea
              id={`metadata-${diagram.id}`}
              name="metadata"
              defaultValue={metadataString}
              rows={6}
            />
          </Field>

          <Field id={`diagram-${diagram.id}`} label="Replace diagram">
            <Input id={`diagram-${diagram.id}`} name="diagram" type="file" accept="image/*,.pdf" />
          </Field>

          {state ? <FormMessage state={state} /> : null}

          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton label="Save changes" />
            <DeleteSharedSpaceForm id={diagram.id} />
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

function FormMessage({ state }: { state: StaffActionResult }) {
  const variant = state.status === 'error' ? 'destructive' : 'success'

  return (
    <div
      className={cn(
        'rounded-md border p-3 text-sm',
        variant === 'destructive'
          ? 'border-destructive/40 bg-destructive/10 text-destructive'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
      )}
    >
      {state.message}
    </div>
  )
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving…' : label}
    </Button>
  )
}

function DeleteSharedSpaceForm({ id }: { id: string }) {
  const [state, formAction] = useFormState(deleteSharedSpaceMap, initialState)

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <DeleteButton />
      {state ? <DeleteMessage state={state} /> : null}
    </form>
  )
}

function DeleteButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant="outline" className="border-destructive text-destructive" disabled={pending}>
      {pending ? 'Removing…' : 'Remove'}
    </Button>
  )
}

function DeleteMessage({ state }: { state: StaffActionResult }) {
  if (state.status === 'success') {
    return <span className="text-sm text-emerald-600">{state.message}</span>
  }

  return <span className="text-sm text-destructive">{state.message}</span>
}
