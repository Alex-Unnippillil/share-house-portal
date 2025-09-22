export type CompletionAction = 'self' | 'cover'

export interface LedgerEntry {
  id: string
  createdAt: Date
  memberId: string
  assignmentId: string
  creditsDelta: number
  reason: string
}

export interface LedgerEntryInput {
  memberId: string
  assignmentId: string
  creditsDelta: number
  reason: string
  id?: string
  createdAt?: Date
}

export interface MemberProfile {
  id: string
  name?: string
  creditBalance?: number
  [key: string]: unknown
}

export interface ChoreAssignment {
  id: string
  assigneeId: string
  status: 'pending' | 'completed'
  title?: string
  completedById?: string | null
  completionAction?: CompletionAction | null
  coveredById?: string | null
  completedAt?: Date | null
}

export interface AuditEvent {
  id: string
  timestamp: Date
  type: 'chore_completion'
  assignmentId: string
  actorId: string
  metadata: Record<string, unknown>
}

export interface CompletionContext {
  assignment: ChoreAssignment
  actorId: string
  ledger: ChoreCreditsLedger
  auditTrail: AuditTrail
  members: MemberDirectory
  action?: CompletionAction
  credits?: number
  reason?: string
  coverMemberId?: string
}

export interface CompletionResult {
  assignment: ChoreAssignment
  ledgerEntries: LedgerEntry[]
  auditEvent: AuditEvent
  balances: Record<string, number>
}

export type MemberDirectory = Map<string, MemberProfile> | MemberProfile[]

function assertNonZeroCredits(delta: number) {
  if (!Number.isFinite(delta)) {
    throw new Error('credits must be a finite number')
  }
  if (delta <= 0) {
    throw new Error('credits must be a positive value')
  }
}

function nextIdentifier(prefix: string, counter: number) {
  return `${prefix}-${counter}`
}

export class ChoreCreditsLedger {
  private entries: LedgerEntry[]
  private counter: number

  constructor(entries: LedgerEntry[] = []) {
    this.entries = entries.map((entry) => ({ ...entry }))
    this.counter = entries.length
  }

  record(input: LedgerEntryInput): LedgerEntry {
    if (!input.memberId) {
      throw new Error('memberId is required for ledger entry')
    }
    if (!input.assignmentId) {
      throw new Error('assignmentId is required for ledger entry')
    }
    if (input.creditsDelta === 0) {
      throw new Error('creditsDelta must not be zero')
    }

    const id = input.id ?? nextIdentifier('ledger', ++this.counter)
    const createdAt = input.createdAt ? new Date(input.createdAt) : new Date()
    const entry: LedgerEntry = {
      id,
      createdAt,
      memberId: input.memberId,
      assignmentId: input.assignmentId,
      creditsDelta: input.creditsDelta,
      reason: input.reason,
    }

    this.entries.push(entry)
    return entry
  }

  all(): readonly LedgerEntry[] {
    return [...this.entries]
  }

  getBalance(memberId: string): number {
    return this.entries
      .filter((entry) => entry.memberId === memberId)
      .reduce((total, entry) => total + entry.creditsDelta, 0)
  }

  getMemberBalances(): Map<string, number> {
    const balances = new Map<string, number>()
    for (const entry of this.entries) {
      balances.set(entry.memberId, (balances.get(entry.memberId) ?? 0) + entry.creditsDelta)
    }
    return balances
  }
}

export class AuditTrail {
  private events: AuditEvent[]
  private counter: number

  constructor(events: AuditEvent[] = []) {
    this.events = events.map((event) => ({
      ...event,
      timestamp: new Date(event.timestamp),
      metadata: { ...event.metadata },
    }))
    this.counter = events.length
  }

  record(event: Omit<AuditEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: Date }): AuditEvent {
    const id = event.id ?? nextIdentifier('audit', ++this.counter)
    const timestamp = event.timestamp ? new Date(event.timestamp) : new Date()
    const metadata = { ...event.metadata }
    const stored: AuditEvent = { id, timestamp, ...event, metadata }
    this.events.push(stored)
    return stored
  }

  all(): readonly AuditEvent[] {
    return [...this.events]
  }

  findByAssignment(assignmentId: string): AuditEvent[] {
    return this.events.filter((event) => event.assignmentId === assignmentId)
  }
}

export function updateMemberBalances(directory: MemberDirectory, ledger: ChoreCreditsLedger): Record<string, number> {
  const balancesFromLedger = ledger.getMemberBalances()
  const knownIds = new Set<string>()
  const results: Record<string, number> = {}

  if (Array.isArray(directory)) {
    for (const profile of directory) {
      knownIds.add(profile.id)
      const balance = balancesFromLedger.get(profile.id) ?? 0
      profile.creditBalance = balance
      results[profile.id] = balance
    }
  } else {
    for (const [id, profile] of directory.entries()) {
      knownIds.add(id)
      const balance = balancesFromLedger.get(id) ?? 0
      profile.creditBalance = balance
      results[id] = balance
    }
    for (const [memberId, balance] of balancesFromLedger.entries()) {
      if (!knownIds.has(memberId)) {
        directory.set(memberId, { id: memberId, creditBalance: balance })
        results[memberId] = balance
      }
    }
  }

  for (const [memberId, balance] of balancesFromLedger.entries()) {
    if (!(memberId in results)) {
      results[memberId] = balance
    }
  }

  return results
}

export function completeChoreAssignment(context: CompletionContext): CompletionResult {
  const {
    assignment,
    actorId,
    ledger,
    auditTrail,
    members,
    action = 'self',
    credits = 1,
    reason = 'Chore completed',
    coverMemberId,
  } = context

  assertNonZeroCredits(credits)

  const ledgerEntries: LedgerEntry[] = []
  const baseReason = reason.trim()
  const creditReason = action === 'cover' ? `${baseReason} (cover credit)` : baseReason
  const debitReason = action === 'cover' ? `${baseReason} (cover debit)` : baseReason
  const completedAt = new Date()

  if (action === 'self') {
    ledgerEntries.push(
      ledger.record({
        memberId: assignment.assigneeId,
        assignmentId: assignment.id,
        creditsDelta: credits,
        reason: creditReason,
      })
    )
  } else if (action === 'cover') {
    const coveringMemberId = coverMemberId ?? actorId
    ledgerEntries.push(
      ledger.record({
        memberId: coveringMemberId,
        assignmentId: assignment.id,
        creditsDelta: credits,
        reason: creditReason,
      })
    )

    if (coveringMemberId !== assignment.assigneeId) {
      ledgerEntries.push(
        ledger.record({
          memberId: assignment.assigneeId,
          assignmentId: assignment.id,
          creditsDelta: -credits,
          reason: debitReason,
        })
      )
    }
  } else {
    throw new Error(`Unsupported completion action: ${action}`)
  }

  const balances = updateMemberBalances(members, ledger)

  const coveringMemberId = action === 'cover' ? coverMemberId ?? actorId : undefined
  const updatedAssignment: ChoreAssignment = {
    ...assignment,
    status: 'completed',
    completedAt,
    completionAction: action,
    completedById: coveringMemberId ?? actorId,
    coveredById: action === 'cover' ? coveringMemberId ?? actorId : assignment.coveredById ?? null,
  }

  const auditEvent = auditTrail.record({
    type: 'chore_completion',
    assignmentId: assignment.id,
    actorId,
    metadata: {
      action,
      reason: baseReason,
      credits,
      ledgerEntries: ledgerEntries.map((entry) => ({
        id: entry.id,
        memberId: entry.memberId,
        assignmentId: entry.assignmentId,
        creditsDelta: entry.creditsDelta,
        reason: entry.reason,
      })),
      resultingBalances: balances,
    },
  })

  return {
    assignment: updatedAssignment,
    ledgerEntries,
    auditEvent,
    balances,
  }
}
