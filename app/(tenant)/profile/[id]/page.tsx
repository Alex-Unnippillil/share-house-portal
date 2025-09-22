import { notFound } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createSupbaseServerClient } from '@/utils/supaone'
import { getMemberFairnessMetric } from '@/queries/member-fairness-metric'

function getInitials(name?: string | null) {
  if (!name) return 'RM'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return 'RM'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase()
}

function formatRole(role?: string | null) {
  if (!role) return 'Roommate'
  return role
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatSigned(value: number) {
  if (value > 0) return `+${value}`
  return value.toString()
}

function formatLastRecorded(lastRecordedAt: string | null) {
  if (!lastRecordedAt) {
    return 'No chore activity recorded yet'
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return `Last recorded ${formatter.format(new Date(lastRecordedAt))}`
}

function describeFairness(fairnessScore: number) {
  if (fairnessScore > 0) {
    return {
      badgeVariant: 'complete' as const,
      label: 'On track',
      detail: 'This member has cleared more chores than they have missed recently.',
    }
  }
  if (fairnessScore < 0) {
    return {
      badgeVariant: 'destructive' as const,
      label: 'Needs attention',
      detail: 'This member has missed more chore assignments than they completed.',
    }
  }
  return {
    badgeVariant: 'secondary' as const,
    label: 'Balanced',
    detail: 'Completed and missed chore assignments are currently in balance.',
  }
}

export default async function MemberProfilePage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createSupbaseServerClient()
  const memberId = params.id

  const [profileResult, fairnessResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, email, role, avatar_url')
      .eq('id', memberId)
      .maybeSingle(),
    getMemberFairnessMetric(supabase, memberId),
  ])

  if (profileResult.error) {
    console.error('Failed to load member profile', profileResult.error)
  }

  if (fairnessResult.error) {
    console.error('Failed to load fairness metric', fairnessResult.error)
  }

  if (!profileResult.data) {
    notFound()
  }

  const fairnessData = fairnessResult.data ?? {
    member_id: memberId,
    full_name: profileResult.data.full_name,
    email: profileResult.data.email,
    avatar_url: profileResult.data.avatar_url,
    role: profileResult.data.role,
    completed_count: 0,
    missed_count: 0,
    fairness_score: 0,
    last_recorded_at: null,
  }

  const summary = describeFairness(fairnessData.fairness_score)

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10">
      <Card>
        <CardHeader className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="size-16">
              <AvatarImage src={profileResult.data.avatar_url ?? undefined} alt={profileResult.data.full_name ?? 'Roommate avatar'} />
              <AvatarFallback>{getInitials(profileResult.data.full_name)}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div>
                <CardTitle className="text-2xl font-semibold">
                  {profileResult.data.full_name ?? 'Unnamed roommate'}
                </CardTitle>
                <CardDescription>
                  {formatRole(profileResult.data.role)} • {profileResult.data.email ?? 'Email unavailable'}
                </CardDescription>
              </div>
              <p className="text-sm text-muted-foreground">
                {summary.detail}
              </p>
            </div>
          </div>
          <Badge variant={summary.badgeVariant} className="whitespace-nowrap px-3 py-1 text-sm">
            {summary.label}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-3xl font-semibold">{fairnessData.completed_count}</p>
            </div>
            <div className="rounded-lg border p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Missed</p>
              <p className="text-3xl font-semibold">{fairnessData.missed_count}</p>
            </div>
            <div className="rounded-lg border p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Fairness score</p>
              <p className="text-3xl font-semibold">{formatSigned(fairnessData.fairness_score)}</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {formatLastRecorded(fairnessData.last_recorded_at)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
