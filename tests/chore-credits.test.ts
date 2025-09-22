import { describe, expect, it } from 'vitest'

import {
  AuditTrail,
  ChoreCreditsLedger,
  completeChoreAssignment,
  type ChoreAssignment,
  type MemberProfile,
} from '@/lib/chores'

describe('Chore credit ledger', () => {
  it('records ledger entries for standard completions and updates balances', () => {
    const ledger = new ChoreCreditsLedger()
    const auditTrail = new AuditTrail()
    const members = new Map<string, MemberProfile>([
      ['member-1', { id: 'member-1', name: 'Alex' }],
    ])

    const assignment: ChoreAssignment = {
      id: 'assignment-1',
      assigneeId: 'member-1',
      status: 'pending',
    }

    const result = completeChoreAssignment({
      assignment,
      actorId: 'member-1',
      ledger,
      auditTrail,
      members,
      credits: 2,
      reason: 'Took out the trash',
    })

    expect(result.assignment).toMatchObject({
      status: 'completed',
      completedById: 'member-1',
      completionAction: 'self',
    })
    expect(result.ledgerEntries).toHaveLength(1)
    expect(result.ledgerEntries[0]).toMatchObject({
      memberId: 'member-1',
      creditsDelta: 2,
      reason: 'Took out the trash',
    })
    expect(members.get('member-1')?.creditBalance).toBe(2)

    const [event] = auditTrail.all()
    expect(event.metadata).toMatchObject({
      action: 'self',
      reason: 'Took out the trash',
      credits: 2,
    })
    expect(event.metadata).toHaveProperty('ledgerEntries')
    expect(event.metadata).toHaveProperty('resultingBalances')
    expect((event.metadata as Record<string, any>).resultingBalances).toMatchObject({
      'member-1': 2,
    })
  })

  it('transfers credits when another roommate covers the chore', () => {
    const ledger = new ChoreCreditsLedger()
    const auditTrail = new AuditTrail()
    const members = new Map<string, MemberProfile>([
      ['member-original', { id: 'member-original', name: 'Casey' }],
      ['member-cover', { id: 'member-cover', name: 'Riley' }],
    ])

    const assignment: ChoreAssignment = {
      id: 'assignment-55',
      assigneeId: 'member-original',
      status: 'pending',
    }

    const result = completeChoreAssignment({
      assignment,
      actorId: 'member-cover',
      ledger,
      auditTrail,
      members,
      action: 'cover',
      coverMemberId: 'member-cover',
      credits: 3,
      reason: 'Covered cleaning rotation',
    })

    expect(result.assignment).toMatchObject({
      status: 'completed',
      completedById: 'member-cover',
      coveredById: 'member-cover',
      completionAction: 'cover',
    })

    expect(result.ledgerEntries).toHaveLength(2)
    expect(result.ledgerEntries).toEqual([
      expect.objectContaining({
        memberId: 'member-cover',
        creditsDelta: 3,
        reason: 'Covered cleaning rotation (cover credit)',
      }),
      expect.objectContaining({
        memberId: 'member-original',
        creditsDelta: -3,
        reason: 'Covered cleaning rotation (cover debit)',
      }),
    ])

    expect(members.get('member-cover')?.creditBalance).toBe(3)
    expect(members.get('member-original')?.creditBalance).toBe(-3)

    const [event] = auditTrail.findByAssignment('assignment-55')
    expect(event.metadata).toMatchObject({
      action: 'cover',
      reason: 'Covered cleaning rotation',
      credits: 3,
    })
    const metadata = event.metadata as Record<string, any>
    expect(metadata.ledgerEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ memberId: 'member-cover', creditsDelta: 3 }),
        expect.objectContaining({ memberId: 'member-original', creditsDelta: -3 }),
      ])
    )
    expect(metadata.resultingBalances).toMatchObject({
      'member-cover': 3,
      'member-original': -3,
    })
  })

  it('does not mutate the original assignment reference', () => {
    const ledger = new ChoreCreditsLedger()
    const auditTrail = new AuditTrail()
    const members: MemberProfile[] = [
      { id: 'resident-1', name: 'Avery' },
    ]

    const assignment: ChoreAssignment = {
      id: 'assignment-9',
      assigneeId: 'resident-1',
      status: 'pending',
    }

    const originalSnapshot = { ...assignment }

    const result = completeChoreAssignment({
      assignment,
      actorId: 'resident-1',
      ledger,
      auditTrail,
      members,
    })

    expect(assignment).toEqual(originalSnapshot)
    expect(result.assignment).not.toBe(assignment)
    expect(members[0].creditBalance).toBe(1)
  })
})
