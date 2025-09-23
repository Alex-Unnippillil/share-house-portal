import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import MemberUpdateForm from '@/app/dashboard/members/components/edit/MemberUpdateForm'
import type { DashboardMember } from '@/app/dashboard/members/data'
import type { MemberRecord } from '@/app/dashboard/members/actions/update-member.types'

vi.mock('@/app/dashboard/members/actions', () => ({
  updateMemberAction: vi.fn(),
}))

import { updateMemberAction } from '@/app/dashboard/members/actions'

const updateMemberActionMock = vi.mocked(updateMemberAction)

describe('MemberUpdateForm conflict handling', () => {
  beforeEach(() => {
    updateMemberActionMock.mockReset()
  })

  it('surfaces a conflict dialog and merges remote values when confirmed', async () => {
    const baseMember: DashboardMember = {
      id: 'member-1',
      full_name: 'Jordan Blake',
      email: 'jordan@example.com',
      phone: '+1 555-0100',
      language: 'en',
      role: 'tenant',
      row_version: 1,
      updated_at: '2024-01-01T12:00:00.000Z',
      createdAt: 'Mon Jan 01 2024',
      status: 'active',
    }

    const remoteMember: MemberRecord = {
      id: 'member-1',
      full_name: 'Jordan Blake',
      email: 'latest@example.com',
      phone: '+1 555-0100',
      language: 'en',
      role: 'tenant',
      row_version: 2,
      updated_at: '2024-01-02T14:00:00.000Z',
    }

    const mergedMember: MemberRecord = {
      ...remoteMember,
      phone: '+1 555-2222',
      row_version: 3,
      updated_at: '2024-01-02T15:00:00.000Z',
    }

    updateMemberActionMock
      .mockResolvedValueOnce({
        status: 'conflict',
        message: 'Someone else updated this member.',
        remote: remoteMember,
        submitted: { phone: '+1 555-2222' },
      })
      .mockResolvedValueOnce({
        status: 'success',
        member: mergedMember,
      })

    const user = userEvent.setup()

    render(<MemberUpdateForm member={baseMember} />)

    const phoneInput = screen.getByLabelText(/phone number/i)
    await user.clear(phoneInput)
    await user.type(phoneInput, '+1 555-2222')

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await screen.findByText(/updated this member/i)

    expect(updateMemberActionMock).toHaveBeenCalledWith({
      memberId: 'member-1',
      rowVersion: 1,
      patch: { phone: '+1 555-2222' },
    })

    const dialog = await screen.findByRole('dialog', { name: /resolve update conflict/i })
    expect(dialog).toBeInTheDocument()

    const emailFieldset = within(dialog).getByText('Email address').closest('fieldset')
    expect(emailFieldset).toBeTruthy()
    if (emailFieldset) {
      const remoteEmailOption = within(emailFieldset).getByText(/Use Supabase value/i)
      await user.click(remoteEmailOption)
    }

    await user.click(within(dialog).getByRole('button', { name: /apply merge/i }))

    await screen.findByText(/Member details updated/i)

    expect(updateMemberActionMock).toHaveBeenLastCalledWith({
      memberId: 'member-1',
      rowVersion: 2,
      patch: { phone: '+1 555-2222' },
    })

    expect(screen.queryByRole('dialog', { name: /resolve update conflict/i })).not.toBeInTheDocument()
    expect(screen.getByText(/Row version 3/)).toBeInTheDocument()
  })
})
