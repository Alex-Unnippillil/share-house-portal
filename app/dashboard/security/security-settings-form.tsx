'use client'

import { useFormState, useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import {
  initialSecurityFormState,
  type SecurityFormState,
  updateTenantSecuritySettings,
} from './actions'

type SecuritySettingsFormProps = {
  initialCidrs: string[]
  initialSessionTtlMinutes: number | null
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving…' : 'Save security controls'}
    </Button>
  )
}

function FieldErrors({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null

  return (
    <ul className="space-y-1 text-sm text-destructive">
      {errors.map((error, index) => (
        <li key={index}>{error}</li>
      ))}
    </ul>
  )
}

export function SecuritySettingsForm({
  initialCidrs,
  initialSessionTtlMinutes,
}: SecuritySettingsFormProps) {
  const [state, formAction] = useFormState<SecurityFormState, FormData>(
    updateTenantSecuritySettings,
    initialSecurityFormState
  )

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="ipAllowCidrs">Allowed IP CIDRs</Label>
        <Textarea
          id="ipAllowCidrs"
          name="ipAllowCidrs"
          defaultValue={initialCidrs.join('\n')}
          placeholder="203.0.113.0/24\n2001:db8::/48"
          rows={6}
        />
        <p className="text-sm text-muted-foreground">
          Provide one CIDR per line. Leave blank to allow any IP.
        </p>
        <FieldErrors errors={state.errors?.ipAllowCidrs} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sessionTtlMinutes">Session TTL (minutes)</Label>
        <Input
          id="sessionTtlMinutes"
          name="sessionTtlMinutes"
          type="number"
          min={5}
          max={10080}
          step={1}
          placeholder="e.g. 240"
          defaultValue={initialSessionTtlMinutes ?? ''}
        />
        <p className="text-sm text-muted-foreground">
          Set a maximum session length in minutes. Leave blank to use the default Supabase session duration.
        </p>
        <FieldErrors errors={state.errors?.sessionTtlMinutes} />
      </div>

      {state.message && (
        <div
          className={`rounded-md border p-3 text-sm ${
            state.status === 'success'
              ? 'border-green-500 text-green-700'
              : 'border-destructive text-destructive'
          }`}
        >
          {state.message}
        </div>
      )}

      <SubmitButton />
    </form>
  )
}
