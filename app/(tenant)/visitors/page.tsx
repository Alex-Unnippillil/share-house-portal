import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

import { VisitorRequestStatusBadge } from '@/components/visitor-request-status-badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatPgDateRange } from '@/lib/date-range'
import { formatDate } from '@/lib/utils'
import { createClient } from '@/utils/supa-server-actions'

export default async function VisitorRequestsPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth')
  }

  const { data: requests, error: requestsError } = await supabase
    .from('visitor_requests')
    .select('id, guest_name, date_range, status, reason, updated_at, created_at, approved_by')
    .eq('member_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <section className="container mx-auto flex max-w-4xl flex-col gap-6 py-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Visitor requests</h1>
          <p className="text-muted-foreground">
            Track upcoming stays and keep everyone aligned on overnight guests.
          </p>
        </div>
        <Button asChild>
          <Link href="/visitors/new">New request</Link>
        </Button>
      </div>

      {requestsError ? (
        <Card>
          <CardHeader>
            <CardTitle>Unable to load requests</CardTitle>
            <CardDescription>
              Something went wrong while fetching your visitor log. Please refresh the page and try again.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!requestsError && (!requests || requests.length === 0) ? (
        <Card>
          <CardHeader>
            <CardTitle>No visitor requests yet</CardTitle>
            <CardDescription>
              Submit a visitor to share arrival and departure dates with your roommates.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!requestsError && requests && requests.length > 0 ? (
        <div className="space-y-4">
          {requests.map((request) => (
            <Link key={request.id} href={`/visitors/${request.id}`} className="block">
              <Card className="transition hover:border-primary/20 hover:shadow-md">
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold">{request.guest_name}</CardTitle>
                    <CardDescription>{formatPgDateRange(request.date_range)}</CardDescription>
                  </div>
                  <VisitorRequestStatusBadge status={request.status} />
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="line-clamp-2 text-sm text-muted-foreground">{request.reason}</p>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Updated {formatDate(request.updated_at ?? request.created_at)}</span>
                    <span className="inline-flex items-center font-medium text-primary">
                      View details
                      <ChevronRight className="ml-1 size-4" aria-hidden />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  )
}
