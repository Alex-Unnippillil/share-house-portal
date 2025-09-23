'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

import type {
  EditableMemberState,
  MemberEditableField,
  MemberRecord,
} from '@/app/dashboard/members/actions/update-member.types'
import { MEMBER_EDITABLE_FIELDS } from '@/app/dashboard/members/actions/update-member.types'

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

function getRecordValue(record: MemberRecord, field: MemberEditableField): string | null {
  return (record as Record<MemberEditableField, string | null | undefined>)[field] ?? null
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

function formatDisplayValue(field: MemberEditableField, value: string | null | undefined): string {
  if (field === 'role') {
    return formatRoleLabel(value ?? null)
  }

  const normalised = normalise(value)
  return normalised ?? '—'
}

interface ConflictResolutionDialogProps {
  conflict: MemberConflictState | null
  open: boolean
  pending: boolean
  onClose: () => void
  onSubmit: (resolution: { remote: MemberRecord; values: EditableMemberState }) => void
}

export default function ConflictResolutionDialog({
  conflict,
  open,
  pending,
  onClose,
  onSubmit,
}: ConflictResolutionDialogProps) {
  const [choices, setChoices] = useState<Record<MemberEditableField, 'local' | 'remote'>>(() => ({
    full_name: 'local',
    email: 'local',
    phone: 'local',
    language: 'local',
    role: 'local',
  }))

  useEffect(() => {
    if (!conflict) {
      return
    }

    setChoices(() => {
      const initial: Record<MemberEditableField, 'local' | 'remote'> = {
        full_name: conflict.patch.full_name !== undefined ? 'local' : 'remote',
        email: conflict.patch.email !== undefined ? 'local' : 'remote',
        phone: conflict.patch.phone !== undefined ? 'local' : 'remote',
        language: conflict.patch.language !== undefined ? 'local' : 'remote',
        role: conflict.patch.role !== undefined ? 'local' : 'remote',
      }

      return initial
    })
  }, [conflict])

  const fieldsToDisplay = useMemo(() => {
    if (!conflict) {
      return [] as MemberEditableField[]
    }

    const fields = MEMBER_EDITABLE_FIELDS.filter(field => {
      const localValue = normalise(conflict.local[field])
      const remoteValue = normalise(getRecordValue(conflict.remote, field))
      const baselineValue = normalise(getRecordValue(conflict.baseline, field))
      const changedLocally = conflict.patch[field] !== undefined
      const remoteChanged = remoteValue !== baselineValue

      return changedLocally || remoteChanged || localValue !== remoteValue
    })

    return fields.length > 0 ? fields : MEMBER_EDITABLE_FIELDS
  }, [conflict])

  const resolvedValues = useMemo(() => {
    if (!conflict) {
      return null
    }

    const next: EditableMemberState = { ...conflict.local }

    for (const field of MEMBER_EDITABLE_FIELDS) {
      if (choices[field] === 'remote') {
        const remoteValue = getRecordValue(conflict.remote, field)
        next[field] = normalise(remoteValue) ?? ''
      }
    }

    return next
  }, [choices, conflict])

  const updatedLabel = useMemo(() => {
    if (!conflict?.remote.updated_at) {
      return 'recently'
    }

    try {
      return formatDistanceToNow(new Date(conflict.remote.updated_at), { addSuffix: true })
    } catch (error) {
      console.error('Failed to format conflict timestamp', error)
      return 'recently'
    }
  }, [conflict?.remote.updated_at])

  if (!conflict) {
    return null
  }

  const handleChoiceChange = (field: MemberEditableField, selection: 'local' | 'remote') => {
    setChoices(previous => ({ ...previous, [field]: selection }))
  }

  const handleSubmit = () => {
    if (!resolvedValues) {
      return
    }

    onSubmit({
      remote: conflict.remote,
      values: resolvedValues,
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!next) {
          onClose()
        }
      }}
    >
      <DialogContent className="max-w-3xl space-y-6">
        <DialogHeader>
          <DialogTitle>Resolve update conflict</DialogTitle>
          <DialogDescription>
            Another teammate updated this member {updatedLabel}. Review each field and choose which
            value should be saved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {fieldsToDisplay.map(field => {
            const localSelected = choices[field] === 'local'
            const remoteSelected = choices[field] === 'remote'
            const localDisplay = formatDisplayValue(field, conflict.local[field])
            const remoteDisplay = formatDisplayValue(field, getRecordValue(conflict.remote, field))

            return (
              <fieldset className="space-y-3" key={field}>
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {FIELD_LABELS[field]}
                </legend>
                <div className="grid gap-3 md:grid-cols-2">
                  <label
                    className={cn(
                      'block cursor-pointer rounded-md border p-3 transition-shadow',
                      localSelected
                        ? 'border-primary ring-2 ring-primary/40'
                        : 'border-border hover:border-primary/40',
                    )}
                  >
                    <input
                      checked={localSelected}
                      className="sr-only"
                      name={`${field}-choice`}
                      onChange={() => handleChoiceChange(field, 'local')}
                      type="radio"
                      value="local"
                    />
                    <p className="text-sm font-semibold">Keep my changes</p>
                    <p className="mt-1 text-sm text-muted-foreground">{localDisplay}</p>
                  </label>

                  <label
                    className={cn(
                      'block cursor-pointer rounded-md border p-3 transition-shadow',
                      remoteSelected
                        ? 'border-primary ring-2 ring-primary/40'
                        : 'border-border hover:border-primary/40',
                    )}
                  >
                    <input
                      checked={remoteSelected}
                      className="sr-only"
                      name={`${field}-choice`}
                      onChange={() => handleChoiceChange(field, 'remote')}
                      type="radio"
                      value="remote"
                    />
                    <p className="text-sm font-semibold">Use Supabase value</p>
                    <p className="mt-1 text-sm text-muted-foreground">{remoteDisplay}</p>
                  </label>
                </div>
              </fieldset>
            )
          })}
        </div>

        <DialogFooter className="gap-2">
          <Button disabled={pending} onClick={onClose} type="button" variant="outline">
            Cancel and keep editing
          </Button>
          <Button disabled={pending} onClick={handleSubmit} type="button">
            Apply merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
