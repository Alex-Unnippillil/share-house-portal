import 'server-only'

import { cache } from 'react'

import type { MemberRecord } from './actions/update-member.types'

export type DashboardMember = MemberRecord & {
  createdAt: string
  status: 'active' | 'resigned'
}

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildMember(overrides: Partial<DashboardMember>): DashboardMember {
  const now = new Date()
  const iso = now.toISOString()

  return {
    id: overrides.id ?? 'member-stub',
    full_name: overrides.full_name ?? 'Roommate',
    email: overrides.email ?? 'roommate@example.com',
    phone: overrides.phone ?? null,
    language: overrides.language ?? 'en',
    role: overrides.role ?? 'user',
    row_version: overrides.row_version ?? 1,
    updated_at: overrides.updated_at ?? iso,
    createdAt: overrides.createdAt ?? now.toDateString(),
    status: overrides.status ?? 'active',
  }
}

export const getDashboardMembers = cache(async (): Promise<DashboardMember[]> => {
  await wait(260)

  return [
    buildMember({
      id: 'member-1',
      full_name: 'Admin Member',
      email: 'admin@example.com',
      role: 'admin',
      status: 'active',
    }),
    buildMember({
      id: 'member-2',
      full_name: 'Jordan Blake',
      email: 'jordan@example.com',
      role: 'tenant',
      status: 'active',
      phone: '+1 555-0100',
    }),
    buildMember({
      id: 'member-3',
      full_name: 'Casey Rivers',
      email: 'casey@example.com',
      role: 'roommate',
      status: 'resigned',
      language: 'es',
      row_version: 2,
    }),
    buildMember({
      id: 'member-4',
      full_name: 'Satoshi Nakamoto',
      email: 'satoshi@example.com',
      role: 'user',
      status: 'active',
      phone: '+81 555-2040',
      language: 'ja',
    }),
  ]
})
