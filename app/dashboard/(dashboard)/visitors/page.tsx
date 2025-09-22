import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { VisitorRequestStatusBadge } from '@/components/visitor-request-status-badge'
import Table from '@/components/ui/Table'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatPgDateRange } from '@/lib/date-range'
import { formatDate } from '@/lib/utils'
import { createSupbaseServerClient } from '@/utils/supaone'

type ProfileSummary = {
  id: string
  full_name: string | null
  email: string | null
}

export default async function AdminVisitorRequestsPage() {
  const supabase = await createSupbaseServerClient()

  const { data: requests, error } = await supabase
    .from('visitor_requests')
    .select('id, guest_name, member_id, approved_by, date_range, status, updated_at, created_at, reason')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to load visitor requests', error)
  }

  const relevantIds = new Set<string>()
  requests?.forEach((request) => {
    relevantIds.add(request.member_id)
    if (request.approved_by) {
      relevantIds.add(request.approved_by)
    }
  })

  let profileMap = new Map<string, ProfileSummary>()

  if (relevantIds.size > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', Array.from(relevantIds))

    if (profilesError) {
      console.error('Failed to load profiles for visitor requests', profilesError)
    }

    if (profiles) {
      profileMap = new Map(profiles.map((profile) => [profile.id, profile]))
    }
  }

  const tableHeaders = ['Guest', 'Host', 'Stay', 'Status', 'Last update']

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Visitor requests</h1>
          <p className="text-muted-foreground">
            Monitor overnight guest submissions across the property and follow up on pending approvals.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          {requests?.length ?? 0} total
        </Badge>
      </div>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Unable to load visitor requests</CardTitle>
            <CardDescription>
              There was a problem retrieving the latest submissions. Refresh the page or try again later.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!error && (!requests || requests.length === 0) ? (
        <Card>
          <CardHeader>
            <CardTitle>No visitor activity yet</CardTitle>
            <CardDescription>
              New roommate submissions will appear here as they register overnight guests.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!error && requests && requests.length > 0 ? (
        <Table headers={tableHeaders}>
          <div className="mx-2 divide-y rounded-sm bg-white dark:bg-inherit">
            {requests.map((request) => {
              const hostProfile = profileMap.get(request.member_id)
              const approverProfile = request.approved_by
                ? profileMap.get(request.approved_by)
                : undefined

              const hostLabel =
                hostProfile?.full_name ?? hostProfile?.email ?? request.member_id

              const approverLabel = approverProfile?.full_name ?? approverProfile?.email

              return (
                <Link
                  key={request.id}
                  href={`/dashboard/visitors/${request.id}`}
                  className="grid grid-cols-5 items-center gap-3 p-3 transition hover:bg-muted/60"
                >
                  <div className="truncate text-sm font-medium text-foreground">
                    {request.guest_name}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    {hostLabel}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    {formatPgDateRange(request.date_range)}
                  </div>
                  <div className="flex items-center gap-2">
                    <VisitorRequestStatusBadge status={request.status} />
                    {approverLabel ? (
                      <span className="hidden text-xs text-muted-foreground xl:inline">
                        by {approverLabel}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{formatDate(request.updated_at ?? request.created_at)}</span>
                    <ChevronRight className="size-4" aria-hidden />
                  </div>
                </Link>
              )
            })}
          </div>
        </Table>
      ) : null}
    </section>
  )
}
