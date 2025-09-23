import { describe, expect, it, vi } from 'vitest'

import { updateMemberWithClient } from '@/app/dashboard/members/actions/update-member.logic'
import type { MemberRecord } from '@/app/dashboard/members/actions/update-member.types'

type UpdateResult = { data: any; error: { message: string } | null }

type SupabaseStub = ReturnType<typeof createSupabaseStub>

function createUpdateChain(result: UpdateResult) {
  const maybeSingle = vi.fn().mockResolvedValue(result)
  const select = vi.fn(() => ({ maybeSingle }))
  const secondEq = vi.fn(() => ({ select }))
  const firstEq = vi.fn(() => ({ eq: secondEq }))
  const update = vi.fn(() => ({ eq: firstEq }))

  return { update, firstEq, secondEq, select, maybeSingle }
}

function createSelectChain(result: UpdateResult) {
  const maybeSingle = vi.fn().mockResolvedValue(result)
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))

  return { select, eq, maybeSingle }
}

function createSupabaseStub({
  updateResult,
  remoteResult,
}: {
  updateResult: UpdateResult
  remoteResult: UpdateResult
}) {
  const updateChain = createUpdateChain(updateResult)
  const remoteChain = createSelectChain(remoteResult)

  const from = vi.fn((table: string) => {
    expect(table).toBe('profiles')
    return {
      update: updateChain.update,
      select: remoteChain.select,
    }
  })

  return {
    from,
    updateChain,
    remoteChain,
  }
}

describe('updateMemberWithClient', () => {
  it('returns conflict payload when Supabase row version mismatches', async () => {
    const remoteRow: MemberRecord = {
      id: '4a5d85c2-351d-4e90-a15d-086a7fcb1e4f',
      full_name: 'Jordan Blake',
      email: 'jordan@example.com',
      phone: '+1 555-0100',
      language: 'en',
      role: 'tenant',
      row_version: 2,
      updated_at: '2024-01-01T12:00:00.000Z',
    }

    const supabase: SupabaseStub = createSupabaseStub({
      updateResult: { data: null, error: null },
      remoteResult: { data: remoteRow, error: null },
    })

    const result = await updateMemberWithClient(
      supabase as any,
      {
        memberId: '4a5d85c2-351d-4e90-a15d-086a7fcb1e4f',
        rowVersion: 1,
        patch: { phone: '+1 555-2222' },
      },
      '2024-01-02T10:00:00.000Z',
    )

    expect(supabase.updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '+1 555-2222',
        row_version: 2,
        updated_at: '2024-01-02T10:00:00.000Z',
      }),
    )
    expect(supabase.remoteChain.select).toHaveBeenCalledWith(
      'id, full_name, email, phone, language, role, row_version, updated_at',
    )

    expect(result.status).toBe('conflict')
    if (result.status === 'conflict') {
      expect(result.remote).toEqual(remoteRow)
      expect(result.submitted).toEqual({ phone: '+1 555-2222' })
      expect(result.message).toMatch(/updated this member/i)
    }
  })

  it('returns success payload when update succeeds', async () => {
    const updatedRow: MemberRecord = {
      id: '7c9bc44f-bb16-42f1-9756-6f0adfb2c441',
      full_name: 'Jordan Blake',
      email: 'jordan@example.com',
      phone: '+1 555-3333',
      language: 'en',
      role: 'tenant',
      row_version: 3,
      updated_at: '2024-01-05T09:00:00.000Z',
    }

    const supabase: SupabaseStub = createSupabaseStub({
      updateResult: { data: updatedRow, error: null },
      remoteResult: { data: null, error: null },
    })

    const result = await updateMemberWithClient(
      supabase as any,
      {
        memberId: '7c9bc44f-bb16-42f1-9756-6f0adfb2c441',
        rowVersion: 2,
        patch: { phone: '+1 555-3333' },
      },
      '2024-01-05T09:00:00.000Z',
    )

    expect(result).toEqual({
      status: 'success',
      member: updatedRow,
    })
    expect(supabase.remoteChain.select).not.toHaveBeenCalled()
  })

  it('rejects updates without changes', async () => {
    const supabase: SupabaseStub = createSupabaseStub({
      updateResult: { data: null, error: null },
      remoteResult: { data: null, error: null },
    })

    const result = await updateMemberWithClient(
      supabase as any,
      {
        memberId: 'a6d6963a-0e7e-4bb2-8de4-2f913b7f5e4a',
        rowVersion: 0,
        patch: {},
      } as any,
      '2024-01-01T00:00:00.000Z',
    )

    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.message).toMatch(/provide at least one field/i)
    }
  })
})
