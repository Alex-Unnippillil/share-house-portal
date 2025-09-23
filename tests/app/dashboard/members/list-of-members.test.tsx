import React from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ListOfMembers from '@/app/dashboard/members/components/ListOfMembers'
import type { DashboardMember } from '@/app/dashboard/members/data'

vi.mock('@/app/dashboard/members/actions', () => ({
  patchMember: vi.fn(),
  createMember: vi.fn(),
  updateMemberById: vi.fn(),
  deleteMemberById: vi.fn(),
  readMembers: vi.fn(),
}))

const { patchMember } = await import('@/app/dashboard/members/actions')

const members: DashboardMember[] = [
  {
    id: 'member-1',
    name: 'Admin Member',
    role: 'admin',
    status: 'active',
    createdAt: '2024-01-01',
  },
  {
    id: 'member-2',
    name: 'Roommate',
    role: 'user',
    status: 'resigned',
    createdAt: '2024-01-01',
  },
]

describe('ListOfMembers inline editing', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('persists role edits without a reload', async () => {
    vi.mocked(patchMember).mockResolvedValue({ id: 'member-1', role: 'user' })

    render(<ListOfMembers members={members} />)

    const user = userEvent.setup()

    const [roleTrigger] = screen.getAllByRole('button', { name: /role for admin member/i })
    await user.click(roleTrigger)

    const roleSelect = await screen.findByRole('combobox', { name: /role for admin member/i })
    await user.selectOptions(roleSelect, 'user')
    await user.keyboard('{Enter}')

    await waitFor(() =>
      expect(patchMember).toHaveBeenCalledWith({
        id: 'member-1',
        updates: { role: 'user' },
      }),
    )

    await waitFor(() => {
      const [updatedTrigger] = screen.getAllByRole('button', { name: /role for admin member/i })
      expect(updatedTrigger).toHaveTextContent(/user/i)
    })
  })

  it('shows inline validation feedback when the server rejects an update', async () => {
    vi.mocked(patchMember).mockRejectedValueOnce(new Error('Role update failed'))

    render(<ListOfMembers members={members} />)

    const user = userEvent.setup()
    const [trigger] = screen.getAllByRole('button', { name: /role for admin member/i })
    await user.click(trigger)

    const roleSelect = await screen.findByRole('combobox', { name: /role for admin member/i })
    await user.selectOptions(roleSelect, 'user')
    await user.keyboard('{Enter}')

    expect(await screen.findByText('Role update failed')).toBeVisible()

    // The editor stays open so the user can correct their input.
    expect(screen.getByRole('combobox', { name: /role for admin member/i })).toBeVisible()
  })
})
