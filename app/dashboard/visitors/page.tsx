import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatQuietHoursWindow } from "@/lib/quiet-hours"
import { ensureHouseholdQuietHours, ensureProfileHousehold } from "@/lib/server/quiet-hours"
import { createClient } from "@/utils/supa-server-actions"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

import { VisitorRequestForm } from "./visitor-request-form"
import type { VisitorRequest } from "./actions"

export default async function VisitorRequestsPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore) as TypedSupabaseClient

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  const { householdId } = await ensureProfileHousehold(supabase, user.id)
  const settings = await ensureHouseholdQuietHours(supabase, householdId)

  const { data: requests, error: requestsError } = await supabase
    .from("visitor_requests")
    .select("id, visitor_name, arrival_at, departure_at, status, created_at, reason")
    .eq("household_id", householdId)
    .order("arrival_at", { ascending: true })

  if (requestsError) {
    console.error("Failed to load visitor requests", requestsError)
  }

  const resolvedRequests = (requests ?? []) as VisitorRequest[]

  const formatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: settings.timezone,
  })

  const quietHoursWindow = formatQuietHoursWindow(settings)

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Visitor requests</h1>
          <p className="text-muted-foreground">
            Log overnight guests, keep roommates informed, and respect quiet hours for your
            household.
          </p>
        </div>
        <div className="rounded-md border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-900 dark:text-blue-100">
          <p>{settings.policy_message}</p>
          <p className="mt-1 text-xs opacity-80">
            Quiet hours: {quietHoursWindow} ({settings.timezone})
          </p>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
        <Card className="order-2 lg:order-1">
          <CardHeader>
            <CardTitle>Upcoming stays</CardTitle>
            <CardDescription>Review approved and pending visitor requests.</CardDescription>
          </CardHeader>
          <CardContent>
            {resolvedRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No visitor requests yet. Submit the form to log an overnight stay.
              </p>
            ) : (
              <ul className="space-y-4">
                {resolvedRequests.map((request) => {
                  const statusLabel = request.status
                    .replace(/_/g, " ")
                    .replace(/^([a-z])/, (match) => match.toUpperCase())

                  return (
                    <li
                      key={request.id}
                      className="rounded-md border border-muted bg-background p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{request.visitor_name}</p>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            {statusLabel}
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>Arrives: {formatter.format(new Date(request.arrival_at))}</p>
                          <p>Departs: {formatter.format(new Date(request.departure_at))}</p>
                        </div>
                      </div>
                      {request.reason && (
                        <p className="mt-3 text-sm text-muted-foreground">{request.reason}</p>
                      )}
                      <p className="mt-3 text-xs text-muted-foreground">
                        Logged {formatter.format(new Date(request.created_at ?? request.arrival_at))}
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="order-1 lg:order-2">
          <CardHeader>
            <CardTitle>Request overnight visitor</CardTitle>
            <CardDescription>
              Share arrival and departure windows so roommates and property managers can
              review the stay in advance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VisitorRequestForm settings={settings} />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
