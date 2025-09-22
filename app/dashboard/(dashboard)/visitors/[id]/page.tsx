import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

import { VisitorRequestStatusBadge } from '@/components/visitor-request-status-badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatPgDateRange } from '@/lib/date-range'
import { formatDate } from '@/lib/utils'
import { createSupbaseServerClient } from '@/utils/supaone'

type ProfileSummary = {
  id: string
  full_name: string | null
  email: string | null
}

export default async function AdminVisitorRequestDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const requestId = Number(params.id)

  if (Number.isNaN(requestId)) {
    notFound()
  }

  const supabase = await createSupbaseServerClient()

  const { data: request, error } = await supabase
    .from('visitor_requests')
    .select('id, guest_name, member_id, approved_by, date_range, status, reason, created_at, updated_at')
    .eq('id', requestId)
    .maybeSingle()

  if (error) {
    console.error('Failed to load visitor request', error)
  }

  if (!request) {
    notFound()
  }

  const profileIds = [request.member_id, request.approved_by].filter(Boolean) as string[]
  let profileMap = new Map<string, ProfileSummary>()

  if (profileIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', profileIds)

    if (profileError) {
      console.error('Failed to load visitor request profiles', profileError)
    }

    if (profiles) {
      profileMap = new Map(profiles.map((profile) => [profile.id, profile]))
    }
  }

  const hostProfile = profileMap.get(request.member_id)
  const approverProfile = request.approved_by
    ? profileMap.get(request.approved_by)
    : undefined

  const hostLabel =
    hostProfile?.full_name ?? hostProfile?.email ?? request.member_id

  const approverLabel = approverProfile?.full_name ?? approverProfile?.email ?? null

  const statusLabel =
    request.status.charAt(0).toUpperCase() + request.status.slice(1)

  return (
    <section className="space-y-6">
      <Link
        href="/dashboard/visitors"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Back to visitor requests
      </Link>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-semibold">{request.guest_name}</CardTitle>
              <CardDescription>{formatPgDateRange(request.date_range)}</CardDescription>
            </div>
            <VisitorRequestStatusBadge status={request.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            Submitted {formatDate(request.created_at)} · Last updated {formatDate(request.updated_at ?? request.created_at)}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 rounded-md border border-dashed border-muted-foreground/30 px-4 py-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between gap-4">
              <span>Host roommate</span>
              <span className="font-medium text-foreground">{hostLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Status</span>
              <span className="font-medium text-foreground">{statusLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Decision owner</span>
              <span className="font-medium text-foreground">{approverLabel ?? '—'}</span>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Reason for visit
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground">{request.reason}</p>
          </div>

          <div className="grid gap-3 rounded-md border border-muted-foreground/30 px-4 py-3 text-sm text-muted-foreground sm:grid-cols-2">
            <div className="flex items-center justify-between gap-4">
              <span>Arrival - Departure</span>
              <span className="font-medium text-foreground">{formatPgDateRange(request.date_range)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Submitted</span>
              <span className="font-medium text-foreground">{formatDate(request.created_at)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Last touch</span>
              <span className="font-medium text-foreground">{formatDate(request.updated_at ?? request.created_at)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
