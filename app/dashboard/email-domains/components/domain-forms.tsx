"use client"

import { useFormState, useFormStatus } from "react-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  initialDomainActionState,
  type DomainActionState,
  upsertTenantEmailDomainAction,
  verifyTenantEmailDomainAction,
} from "../actions"

function SubmitButton({
  children,
  pendingText,
}: {
  children: React.ReactNode
  pendingText: string
}) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" isLoading={pending} className="whitespace-nowrap">
      {pending ? pendingText : children}
    </Button>
  )
}

export function DomainSettingsForm({
  tenantId,
  defaultDomain,
}: {
  tenantId: string
  defaultDomain: string
}) {
  const [state, formAction] = useFormState<DomainActionState, FormData>(
    upsertTenantEmailDomainAction,
    initialDomainActionState
  )

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="tenantId" value={tenantId} />
      <div className="space-y-2">
        <Label htmlFor={`domain-${tenantId}`}>Sender domain</Label>
        <Input
          id={`domain-${tenantId}`}
          name="domain"
          placeholder="example.com"
          defaultValue={defaultDomain}
          autoComplete="off"
        />
        <p className="text-sm text-muted-foreground">
          We will generate SPF and DKIM records for this domain.
        </p>
      </div>
      {state.status === "error" && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}
      {state.status === "success" && (
        <p className="text-sm text-emerald-600">{state.message}</p>
      )}
      <SubmitButton pendingText="Generating records...">
        Generate DNS records
      </SubmitButton>
    </form>
  )
}

export function VerifyDomainForm({ tenantId }: { tenantId: string }) {
  const [state, formAction] = useFormState<DomainActionState, FormData>(
    verifyTenantEmailDomainAction,
    initialDomainActionState
  )

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="tenantId" value={tenantId} />
      {state.status === "error" && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}
      {state.status === "success" && (
        <p className="text-sm text-emerald-600">{state.message}</p>
      )}
      <SubmitButton pendingText="Checking status...">
        Check verification
      </SubmitButton>
    </form>
  )
}
