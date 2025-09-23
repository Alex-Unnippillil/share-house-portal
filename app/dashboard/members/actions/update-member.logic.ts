import { z } from 'zod'

import type { TypedSupabaseClient } from '@/utils/typed-supabase-client'

import {
  MEMBER_EDITABLE_FIELDS,
  MEMBER_ROLE_OPTIONS,
  type MemberPatch,
  type MemberRecord,
  type UpdateMemberInput,
  type UpdateMemberResult,
} from './update-member.types'

const memberPatchSchema = z
  .object({
    full_name: z.string().max(120).nullable().optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().max(32).nullable().optional(),
    language: z.string().max(12).nullable().optional(),
    role: z.enum(MEMBER_ROLE_OPTIONS).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

const updateInputSchema = z.object({
  memberId: z.string().uuid('Invalid member id provided.'),
  rowVersion: z.number().int().min(0),
  patch: memberPatchSchema,
})

function normalisePatch(patch: MemberPatch): MemberPatch {
  const next: MemberPatch = {}

  for (const field of MEMBER_EDITABLE_FIELDS) {
    if (!(field in patch)) {
      continue
    }

    const value = patch[field]
    if (value === undefined) {
      continue
    }

    if (typeof value === 'string') {
      const trimmed = value.trim()
      next[field] = trimmed.length === 0 ? null : trimmed
      continue
    }

    next[field] = value ?? null
  }

  return next
}

function toMemberRecord(row: MemberRecord): MemberRecord {
  return {
    id: row.id,
    full_name: row.full_name ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    language: row.language ?? null,
    role: row.role ?? null,
    row_version: row.row_version ?? 0,
    updated_at: row.updated_at ?? null,
  }
}

export async function updateMemberWithClient(
  supabase: Pick<TypedSupabaseClient, 'from'>,
  input: UpdateMemberInput,
  timestamp: string = new Date().toISOString(),
): Promise<UpdateMemberResult> {
  const parsed = updateInputSchema.safeParse({
    memberId: input.memberId,
    rowVersion: input.rowVersion,
    patch: normalisePatch(input.patch),
  })

  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return {
      status: 'error',
      message: issue?.message ?? 'Invalid member update payload.',
    }
  }

  const { memberId, rowVersion, patch } = parsed.data

  const updatePayload: Record<string, unknown> = {
    updated_at: timestamp,
    row_version: rowVersion + 1,
  }

  for (const [key, value] of Object.entries(patch)) {
    updatePayload[key] = value
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', memberId)
      .eq('row_version', rowVersion)
      .select('id, full_name, email, phone, language, role, row_version, updated_at')
      .maybeSingle()

    if (error) {
      return {
        status: 'error',
        message: `Failed to update member: ${error.message}`,
      }
    }

    if (data) {
      return {
        status: 'success',
        member: toMemberRecord(data as MemberRecord),
      }
    }

    const { data: remote, error: remoteError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, language, role, row_version, updated_at')
      .eq('id', memberId)
      .maybeSingle()

    if (remoteError) {
      return {
        status: 'error',
        message: 'Failed to load the latest member details after a conflict.',
      }
    }

    if (!remote) {
      return {
        status: 'error',
        message: 'Member no longer exists.',
      }
    }

    return {
      status: 'conflict',
      message:
        'Someone else updated this member before you. Review the latest data and merge your changes.',
      remote: toMemberRecord(remote as MemberRecord),
      submitted: patch,
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unexpected error while updating member.'
    return {
      status: 'error',
      message,
    }
  }
}
