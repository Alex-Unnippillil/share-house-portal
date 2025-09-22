import Link from 'next/link'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
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
import { createClient } from '@/utils/supa-server-actions'

export default async function VisitorRequestDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const requestId = Number(params.id)

  if (Number.isNaN(requestId)) {
    notFound()
  }

  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth')
  }

  const { data: request, error: requestError } = await supabase
    .from('visitor_requests')
    .select('id, guest_name, date_range, reason, status, created_at, updated_at, approved_by, member_id')
    .eq('id', requestId)
    .maybeSingle()

  if (requestError) {
    console.error('Failed to load visitor request', requestError)
  }

  if (!request) {
    notFound()
  }

  if (request.member_id !== user.id) {
    // RLS should prevent this, but guard on the server just in case.
    notFound()
  }

  let approvedByName: string | null = null

  const statusLabel =
    request.status.charAt(0).toUpperCase() + request.status.slice(1)

  if (request.approved_by) {
    const { data: approverProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', request.approved_by)
      .maybeSingle()

    approvedByName = approverProfile?.full_name ?? approverProfile?.email ?? null
  }

  return (
    <section className="container mx-auto flex max-w-3xl flex-col gap-6 py-10">
      <Link
        href="/visitors"
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
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Reason for visit
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground">{request.reason}</p>
          </div>
          <div className="grid gap-3 rounded-md border border-dashed border-muted-foreground/30 px-4 py-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between gap-4">
              <span>Stay window</span>
              <span className="font-medium text-foreground">{formatPgDateRange(request.date_range)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Status</span>
              <span className="font-medium text-foreground">{statusLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Approval</span>
              <span className="font-medium text-foreground">
                {request.status === 'pending'
                  ? 'Awaiting review'
                  : approvedByName ?? 'Approved internally'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
