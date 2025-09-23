'use client'

import { useMemo, useState, useTransition } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { formatDistanceToNow } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import { updateMemberAction } from '@/app/dashboard/members/actions'
import type {
  EditableMemberState,
  MemberPatch,
  MemberRecord,
} from '@/app/dashboard/members/actions/update-member.types'
import {
  MEMBER_EDITABLE_FIELDS,
  MEMBER_ROLE_OPTIONS,
  type MemberEditableField,
} from '@/app/dashboard/members/actions/update-member.types'
import type { DashboardMember } from '@/app/dashboard/members/data'

import ConflictResolutionDialog from './ConflictResolutionDialog'
import type { MemberConflictState } from './types'

const FIELD_LABELS: Record<MemberEditableField, string> = {
  full_name: 'Full name',
  email: 'Email address',
  phone: 'Phone number',
  language: 'Language',
  role: 'Role',
}

function normalise(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

function toEditableState(member: MemberRecord): EditableMemberState {
  return {
    full_name: member.full_name ?? '',
    email: member.email ?? '',
    phone: member.phone ?? '',
    language: member.language ?? '',
    role: member.role ?? '',
  }
}

function getRecordValue(record: MemberRecord, field: MemberEditableField): string | null {
  return (record as Record<MemberEditableField, string | null | undefined>)[field] ?? null
}

function buildPatch(baseline: MemberRecord, target: EditableMemberState): MemberPatch {
  const patch: MemberPatch = {}

  for (const field of MEMBER_EDITABLE_FIELDS) {
    const baselineValue = normalise(getRecordValue(baseline, field))
    const targetValue = normalise(target[field])

    if (baselineValue !== targetValue) {
      patch[field] = targetValue
    }
  }

  return patch
}

function formatRoleLabel(role: string | null): string {
  if (!role) {
    return 'Unassigned'
  }

  return role
    .split('_')
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

interface MemberUpdateFormProps {
  member: DashboardMember
}

export default function MemberUpdateForm({ member }: MemberUpdateFormProps) {
  const initialRecord: MemberRecord = useMemo(
    () => ({
      id: member.id,
      full_name: member.full_name,
      email: member.email,
      phone: member.phone,
      language: member.language,
      role: member.role,
      row_version: member.row_version,
      updated_at: member.updated_at,
    }),
    [member],
  )

  const [base, setBase] = useState<MemberRecord>(initialRecord)
  const [draft, setDraft] = useState<EditableMemberState>(() => toEditableState(initialRecord))
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [conflict, setConflict] = useState<MemberConflictState | null>(null)
  const [isPending, startTransition] = useTransition()

  const lastUpdatedLabel = useMemo(() => {
    if (!base.updated_at) {
      return 'unknown'
    }

    try {
      return formatDistanceToNow(new Date(base.updated_at), { addSuffix: true })
    } catch (error) {
      console.error('Failed to format last updated timestamp', error)
      return 'recently'
    }
  }, [base.updated_at])

  const handleInputChange = (field: Exclude<MemberEditableField, 'role'>) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      setDraft(previous => ({ ...previous, [field]: value }))
    }

  const handleRoleChange = (value: string) => {
    setDraft(previous => ({ ...previous, role: value }))
  }

  const applyUpdate = (
    rowVersion: number,
    patch: MemberPatch,
    baseline: MemberRecord,
    currentDraft: EditableMemberState,
  ) => {
    startTransition(async () => {
      setFeedback(null)

      const result = await updateMemberAction({
        memberId: base.id,
        rowVersion,
        patch,
      })

      if (result.status === 'success') {
        setBase(result.member)
        setDraft(toEditableState(result.member))
        setFeedback({ type: 'success', message: 'Member details updated.' })
        return
      }

      if (result.status === 'conflict') {
        setFeedback({ type: 'error', message: result.message })
        setConflict({
          remote: result.remote,
          baseline,
          local: currentDraft,
          patch,
        })
        return
      }

      setFeedback({ type: 'error', message: result.message })
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const patch = buildPatch(base, draft)
    if (Object.keys(patch).length === 0) {
      setFeedback({ type: 'error', message: 'No changes to save.' })
      return
    }

    applyUpdate(base.row_version, patch, base, { ...draft })
  }

  const handleConflictCancel = () => {
    setConflict(null)
  }

  const handleConflictResolved = (resolution: {
    remote: MemberRecord
    values: EditableMemberState
  }) => {
    setConflict(null)
    setDraft(resolution.values)

    const patch = buildPatch(resolution.remote, resolution.values)

    if (Object.keys(patch).length === 0) {
      setBase(resolution.remote)
      setFeedback({
        type: 'success',
        message: 'Your view now reflects the latest Supabase data.',
      })
      return
    }

    applyUpdate(resolution.remote.row_version, patch, resolution.remote, resolution.values)
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Member profile</h3>
        <p className="text-sm text-muted-foreground">
          Last updated {lastUpdatedLabel}. Adjust contact details and role assignments
          for this household member.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="member-full-name">{FIELD_LABELS.full_name}</Label>
          <Input
            id="member-full-name"
            value={draft.full_name}
            onChange={handleInputChange('full_name')}
            placeholder="Jordan Blake"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="member-email">{FIELD_LABELS.email}</Label>
          <Input
            id="member-email"
            type="email"
            value={draft.email}
            onChange={handleInputChange('email')}
            placeholder="jordan@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="member-phone">{FIELD_LABELS.phone}</Label>
          <Input
            id="member-phone"
            value={draft.phone}
            onChange={handleInputChange('phone')}
            placeholder="+1 555-0100"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="member-language">{FIELD_LABELS.language}</Label>
          <Input
            id="member-language"
            value={draft.language}
            onChange={handleInputChange('language')}
            placeholder="en"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="member-role">{FIELD_LABELS.role}</Label>
          <Select value={draft.role} onValueChange={handleRoleChange}>
            <SelectTrigger id="member-role">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Unassigned</SelectItem>
              {MEMBER_ROLE_OPTIONS.map(role => (
                <SelectItem key={role} value={role}>
                  {formatRoleLabel(role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {feedback ? (
        <p
          className={cn(
            'text-sm',
            feedback.type === 'error' ? 'text-destructive' : 'text-emerald-600',
          )}
        >
          {feedback.message}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button disabled={isPending} type="submit">
          {isPending ? 'Saving…' : 'Save changes'}
        </Button>
        <span className="text-sm text-muted-foreground">
          Row version {base.row_version}
        </span>
      </div>

      <ConflictResolutionDialog
        conflict={conflict}
        onClose={handleConflictCancel}
        onSubmit={handleConflictResolved}
        open={Boolean(conflict)}
        pending={isPending}
      />
    </form>
  )
}
