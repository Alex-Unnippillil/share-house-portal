import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/server'

import { ScanMissedChoresForm } from './scan-missed-form'

type ChoreStatus = 'open' | 'completed' | 'missed' | 'skipped'

type ChoreAssignmentRow = {
  id: string
  title: string
  description: string | null
  due_at: string
  status: ChoreStatus
  assigned_to: string
  profile: {
    full_name: string | null
  } | null
}

type FairnessCounterRow = {
  profile_id: string
  completed_count: number
  missed_count: number
  balance: number
  profile: {
    full_name: string | null
  } | null
}

const statusLabels: Record<ChoreStatus, string> = {
  open: 'Open',
  completed: 'Completed',
  missed: 'Missed',
  skipped: 'Skipped',
}

const statusVariants: Record<ChoreStatus, 'default' | 'secondary' | 'destructive' | 'outline' | 'complete'> = {
  open: 'secondary',
  completed: 'complete',
  missed: 'destructive',
  skipped: 'outline',
}

const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

function formatDateTime(date: Date) {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getRelativeDueLabel(dueDate: Date, now: Date) {
  const diffMs = dueDate.getTime() - now.getTime()
  const absDiff = Math.abs(diffMs)

  if (absDiff < 60 * 1000) {
    return {
      label: diffMs >= 0 ? 'in under a minute' : 'less than a minute ago',
      isPast: diffMs < 0,
    }
  }

  const units: Array<{ threshold: number; unit: Intl.RelativeTimeFormatUnit }> = [
    { threshold: 24 * 60 * 60 * 1000, unit: 'day' },
    { threshold: 60 * 60 * 1000, unit: 'hour' },
  ]

  let unit: Intl.RelativeTimeFormatUnit = 'minute'
  let divisor = 60 * 1000

  for (const candidate of units) {
    if (absDiff >= candidate.threshold) {
      unit = candidate.unit
      divisor = candidate.threshold
      break
    }
  }

  const magnitude = Math.max(1, Math.round(absDiff / divisor))
  const value = magnitude * (diffMs < 0 ? -1 : 1)

  return {
    label: relativeFormatter.format(value, unit),
    isPast: diffMs < 0,
  }
}

export default async function ChoresPage() {
  const supabase = createClient()

  const [{ data: assignmentsData, error: assignmentsError }, { data: fairnessData, error: fairnessError }] =
    await Promise.all([
      supabase
        .from('chore_assignments')
        .select('id, title, description, due_at, status, assigned_to, profile:profiles(full_name)')
        .order('due_at', { ascending: true }),
      supabase
        .from('chore_fairness_counters')
        .select('profile_id, completed_count, missed_count, balance, profile:profiles(full_name)')
        .order('balance', { ascending: true }),
    ])

  if (assignmentsError) {
    console.error('Failed to load chore assignments', assignmentsError)
  }

  if (fairnessError) {
    console.error('Failed to load chore fairness counters', fairnessError)
  }

  const assignments = (assignmentsData ?? []) as ChoreAssignmentRow[]
  const fairnessCounters = (fairnessData ?? []) as FairnessCounterRow[]

  const stats = assignments.reduce(
    (acc, assignment) => {
      acc.total += 1
      if (assignment.status === 'open') acc.open += 1
      if (assignment.status === 'missed') acc.missed += 1
      if (assignment.status === 'completed') acc.completed += 1
      return acc
    },
    { total: 0, open: 0, missed: 0, completed: 0 }
  )

  const now = new Date()

  const summaryCards = [
    {
      label: 'Total chores',
      value: stats.total,
      description: 'Assignments scheduled for your household.',
      highlight: false,
    },
    {
      label: 'Open chores',
      value: stats.open,
      description: 'Chores that are still awaiting completion.',
      highlight: false,
    },
    {
      label: 'Missed chores',
      value: stats.missed,
      description: 'Chores that slipped past their due time.',
      highlight: stats.missed > 0,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Chores</h1>
          <p className="text-muted-foreground">
            Track shared assignments, audit missed chores, and keep the rotation feeling fair for every roommate.
          </p>
        </div>
        <ScanMissedChoresForm />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summaryCards.map((card) => (
          <Card
            key={card.label}
            className={cn(
              card.highlight && card.value > 0 && 'border-destructive/60 bg-destructive/10 shadow-sm shadow-destructive/10'
            )}
          >
            <CardHeader>
              <CardTitle className="text-base font-semibold text-muted-foreground">{card.label}</CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={cn('text-3xl font-semibold', card.highlight ? 'text-destructive' : 'text-foreground')}>
                {card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Chore assignments</CardTitle>
            <CardDescription>
              Missed chores are highlighted automatically so you can follow up and keep the rotation balanced.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No chore assignments have been scheduled yet.</p>
            ) : (
              <div className="space-y-4">
                {assignments.map((assignment) => {
                  const dueDate = new Date(assignment.due_at)
                  const dueInfo = getRelativeDueLabel(dueDate, now)
                  const isMissed = assignment.status === 'missed'

                  return (
                    <div
                      key={assignment.id}
                      className={cn(
                        'rounded-lg border p-4 transition',
                        isMissed
                          ? 'border-destructive/60 bg-destructive/10 shadow-sm shadow-destructive/10'
                          : 'border-border bg-card'
                      )}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-foreground">{assignment.title}</h3>
                            <Badge variant={statusVariants[assignment.status]}>{statusLabels[assignment.status]}</Badge>
                          </div>
                          {assignment.description ? (
                            <p className="text-sm text-muted-foreground">{assignment.description}</p>
                          ) : null}
                          <p
                            className={cn(
                              'text-sm',
                              isMissed || (dueInfo.isPast && assignment.status !== 'completed')
                                ? 'font-semibold text-destructive'
                                : 'text-muted-foreground'
                            )}
                          >
                            Due {dueInfo.label}{' '}
                            <span className="text-xs text-muted-foreground">({formatDateTime(dueDate)})</span>
                          </p>
                        </div>
                        <div className="rounded-md bg-muted px-3 py-2 text-sm">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Assigned to</p>
                          <p className="font-medium text-foreground">
                            {assignment.profile?.full_name ?? 'Unassigned roommate'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fairness counters</CardTitle>
            <CardDescription>
              Each missed chore nudges a roommate’s fairness balance down. Use this to redistribute work and keep things even.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fairnessCounters.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No fairness adjustments yet. Missed chores will appear here with updated balances.
              </p>
            ) : (
              <div className="space-y-3">
                {fairnessCounters.map((counter) => {
                  const balanceVariant =
                    counter.balance > 0 ? 'complete' : counter.balance < 0 ? 'destructive' : 'secondary'
                  const formattedBalance = counter.balance > 0 ? `+${counter.balance}` : `${counter.balance}`

                  return (
                    <div key={counter.profile_id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="font-medium text-foreground">
                          {counter.profile?.full_name ?? 'Unassigned roommate'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {counter.completed_count} completed • {counter.missed_count} missed
                        </p>
                      </div>
                      <Badge variant={balanceVariant} className="px-3 py-1 text-xs">
                        Balance {formattedBalance}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
