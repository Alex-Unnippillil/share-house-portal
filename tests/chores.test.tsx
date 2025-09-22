import { fireEvent, render, waitFor } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import React from 'react'

import { CompleteChoreForm } from '@/app/(tenant)/chores/[assignmentId]/completion-form'

const completeChoreMock = vi.fn().mockResolvedValue({ data: { status: 'completed' } })

vi.mock('@/app/(tenant)/chores/[assignmentId]/actions', () => ({
  __esModule: true,
  completeChore: (payload: unknown) => completeChoreMock(payload),
}))

const uploadMock = vi.fn()
const getPublicUrlMock = vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/proof' } })

vi.mock('@/utils/supabase-browser', () => ({
  __esModule: true,
  default: () => ({
    storage: {
      from: () => ({
        upload: uploadMock,
        getPublicUrl: getPublicUrlMock,
      }),
    },
  }),
}))

describe('chore assignment RLS policies', () => {
  it('restricts updates to the assigned roommate', () => {
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20250409_onyxpwa.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')
    const policyMatch = sql.match(
      /CREATE POLICY "Members can update their own chore assignments."[\s\S]+?;/
    )

    expect(sql).toContain('CREATE POLICY "Members can update their own chore assignments."')
    expect(policyMatch?.[0]).toContain('USING ((assigned_to = auth.uid()))')
    expect(policyMatch?.[0]).toContain('WITH CHECK ((assigned_to = auth.uid()))')
  })
})

describe('CompleteChoreForm', () => {
  beforeEach(() => {
    completeChoreMock.mockClear()
    uploadMock.mockClear()
  })

  it('submits successfully without requiring proof', async () => {
    const { getByTestId } = render(
      <CompleteChoreForm
        assignmentId="assignment-123"
        status="assigned"
        creditValue={5}
        initialProofUrl={null}
      />
    )

    const form = getByTestId('complete-chore-form')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(completeChoreMock).toHaveBeenCalledTimes(1)
    })

    expect(uploadMock).not.toHaveBeenCalled()
    expect(completeChoreMock).toHaveBeenCalledWith({ assignmentId: 'assignment-123', proofUrl: null })
  })
})
