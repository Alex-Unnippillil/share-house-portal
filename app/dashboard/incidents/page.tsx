import { formatDistanceToNow } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createIncidentAction, updateIncidentAction } from "@/app/dashboard/incidents/actions"
import type { Incident, IncidentSeverity, IncidentUpdate } from "@/lib/incidents/types"
import { INCIDENT_SEVERITIES, INCIDENT_STATUSES } from "@/lib/incidents/types"
import { createSupbaseServerClient } from "@/utils/supaone"
import { cn } from "@/lib/utils"
import { humanizeLabel, severityBadgeStyles } from "@/lib/incidents/presentation"

type IncidentWithUpdates = Incident & {
  incident_updates?: IncidentUpdate[] | null
}

type ProfileSummary = {
  id: string
  full_name: string | null
}

export default async function IncidentsPage() {
  const supabase = await createSupbaseServerClient()

  const [incidentsResponse, profilesResponse] = await Promise.all([
    supabase
      .from("incidents")
      .select("*, incident_updates(*)")
      .order("created_at", { ascending: false })
      .order("created_at", { referencedTable: "incident_updates", ascending: false }),
    supabase.from("profiles").select("id, full_name").order("full_name", { ascending: true }),
  ])

  if (incidentsResponse.error) {
    console.error("Failed to load incidents", incidentsResponse.error)
  }

  if (profilesResponse.error) {
    console.error("Failed to load profiles", profilesResponse.error)
  }

  const incidents = (incidentsResponse.data ?? []) as IncidentWithUpdates[]
  const profiles = (profilesResponse.data ?? []) as ProfileSummary[]

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Report a new incident</CardTitle>
          <CardDescription>
            Capture maintenance or safety issues and broadcast them to the household message board.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createIncidentAction} className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="householdId" className="text-sm font-medium">
                Household ID
              </label>
              <Input id="householdId" name="householdId" placeholder="e.g. 2b81d1d0-..." required />
            </div>
            <div className="grid gap-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <Input id="title" name="title" placeholder="Short summary" required />
            </div>
            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                name="description"
                placeholder="Provide context that will be shared on the message board"
                required
              />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="severity" className="text-sm font-medium">
                  Severity
                </label>
                <select
                  id="severity"
                  name="severity"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  defaultValue="medium"
                >
                  {INCIDENT_SEVERITIES.map((option) => (
                    <option key={option} value={option}>
                      {option.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <label htmlFor="assignedMemberId" className="text-sm font-medium">
                  Assigned team member
                </label>
                <select
                  id="assignedMemberId"
                  name="assignedMemberId"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  defaultValue=""
                >
                  <option value="">Unassigned</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.full_name ?? profile.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit">Create incident</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Active incidents</h2>
          <p className="text-sm text-muted-foreground">
            Use the forms below to update status, severity, assignments, and broadcast message board updates.
          </p>
        </div>
        <div className="grid gap-4">
          {incidents.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No incidents have been reported yet.
              </CardContent>
            </Card>
          ) : (
            incidents.map((incident) => {
              const latestUpdate = incident.incident_updates?.[0]
              return (
                <Card key={incident.id}>
                  <CardHeader>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle className="text-lg">{incident.title}</CardTitle>
                        <CardDescription>Household {incident.household_id}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={cn("capitalize", severityBadgeStyles[incident.severity as IncidentSeverity])}>
                          {humanizeLabel(incident.severity)}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {humanizeLabel(incident.status)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p className="text-sm text-muted-foreground">{incident.description}</p>
                    <div className="rounded-md border bg-muted/30 p-4">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Latest update</p>
                      {latestUpdate ? (
                        <div className="mt-1 space-y-1 text-sm">
                          <p>{latestUpdate.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(latestUpdate.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-muted-foreground">No updates have been posted yet.</p>
                      )}
                    </div>
                    <form action={updateIncidentAction} className="grid gap-4">
                      <input type="hidden" name="incidentId" value={incident.id} />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="grid gap-2">
                          <label htmlFor={`status-${incident.id}`} className="text-sm font-medium">
                            Status
                          </label>
                          <select
                            id={`status-${incident.id}`}
                            name="status"
                            defaultValue={incident.status}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            {INCIDENT_STATUSES.map((option) => (
                              <option key={option} value={option}>
                                {humanizeLabel(option)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <label htmlFor={`severity-${incident.id}`} className="text-sm font-medium">
                            Severity
                          </label>
                          <select
                            id={`severity-${incident.id}`}
                            name="severity"
                            defaultValue={incident.severity}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            {INCIDENT_SEVERITIES.map((option) => (
                              <option key={option} value={option}>
                                {humanizeLabel(option)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <label htmlFor={`assigned-${incident.id}`} className="text-sm font-medium">
                          Assigned team member
                        </label>
                        <select
                          id={`assigned-${incident.id}`}
                          name="assignedMemberId"
                          defaultValue={incident.assigned_member_id ?? ""}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="">Unassigned</option>
                          {profiles.map((profile) => (
                            <option key={profile.id} value={profile.id}>
                              {profile.full_name ?? profile.id}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid gap-2">
                        <label htmlFor={`message-${incident.id}`} className="text-sm font-medium">
                          Message board note
                        </label>
                        <Textarea
                          id={`message-${incident.id}`}
                          name="message"
                          placeholder="Share context for roommates and property managers"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit">Post update</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}
