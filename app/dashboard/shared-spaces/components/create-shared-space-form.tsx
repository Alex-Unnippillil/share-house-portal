'use client'

import { useEffect, useRef } from 'react'
import { useFormState, useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import { createSharedSpaceMap, type StaffActionResult } from '../actions'

const initialState: StaffActionResult | null = null

export function CreateSharedSpaceForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction] = useFormState(createSharedSpaceMap, initialState)

  useEffect(() => {
    if (state?.status === 'success') {
      formRef.current?.reset()
    }
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="space-y-6 rounded-xl border bg-card p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Upload a shared space diagram</h2>
        <p className="text-sm text-muted-foreground">
          Provide lease, unit, and tenant identifiers along with the diagram asset and optional metadata describing room labels.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field id="leaseId" label="Lease ID" required>
          <Input id="leaseId" name="leaseId" placeholder="e.g. lease-123" required />
        </Field>
        <Field id="unitId" label="Unit ID">
          <Input id="unitId" name="unitId" placeholder="Optional unit identifier" />
        </Field>
        <Field id="tenantId" label="Tenant profile ID" required>
          <Input id="tenantId" name="tenantId" placeholder="UUID of tenant profile" required />
        </Field>
        <Field id="title" label="Title">
          <Input id="title" name="title" placeholder="Lobby overview" />
        </Field>
      </div>

      <Field id="description" label="Description">
        <Textarea
          id="description"
          name="description"
          placeholder="Short description visible to tenants"
          rows={3}
        />
      </Field>

      <Field id="metadata" label="Metadata JSON">
        <Textarea
          id="metadata"
          name="metadata"
          placeholder='{"roomLabels":[{"label":"Kitchen","x":0.35,"y":0.42}]}'
          rows={4}
        />
      </Field>

      <Field id="diagram" label="Diagram file" required>
        <Input id="diagram" name="diagram" type="file" accept="image/*,.pdf" required />
      </Field>

      {state ? <FormMessage state={state} /> : null}

      <div className="flex items-center justify-end gap-3">
        <SubmitButton />
      </div>
    </form>
  )
}

function Field({
  id,
  label,
  children,
  required,
}: {
  id: string
  label: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className={cn(required ? 'after:ml-1 after:text-destructive after:content-["*"]' : undefined)}>
        {label}
      </Label>
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

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving…' : 'Save diagram'}
    </Button>
  )
}
