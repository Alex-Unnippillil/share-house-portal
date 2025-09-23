import SmartLink from "@/components/navigation/SmartLink"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardAudience, getMaintenanceTickets } from "../data"
import { Wrench } from "lucide-react"

const statusLabels: Record<"scheduled" | "in_progress" | "awaiting_vendor", string> = {
  scheduled: "Scheduled",
  in_progress: "In progress",
  awaiting_vendor: "Awaiting vendor",
}

const priorityVariants: Record<"low" | "medium" | "high", "outline" | "secondary" | "destructive" | "complete"> = {
  low: "outline",
  medium: "secondary",
  high: "destructive",
}

export async function MaintenanceOverviewCard() {
  const [tickets, audience] = await Promise.all([
    getMaintenanceTickets(),
    getDashboardAudience(),
  ])

  const title =
    audience === "manager"
      ? "Portfolio maintenance snapshot"
      : "Maintenance snapshot"
  const description =
    audience === "manager"
      ? "Stay ahead of vendor follow-ups and resident updates across your portfolio."
      : "See what the property team is working on and what’s coming up next."
  const emptyCopy =
    audience === "manager"
      ? "No open maintenance items across your portfolio. We’ll surface new requests the moment they come in."
      : "No open maintenance items. Submit a request if something needs attention around the home."
  const ctaLabel = audience === "manager" ? "View maintenance dashboard" : "View maintenance queue"

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wrench className="size-5 text-primary" />
            {title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {tickets.length ? (
          <ul className="space-y-3">
            {tickets.map((ticket) => (
              <li
                key={ticket.id}
                className="rounded-lg border border-dashed border-border/70 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{ticket.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {ticket.unitLabel || "Household"} • Last updated {new Date(ticket.updatedAt).toLocaleDateString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                        }
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={priorityVariants[ticket.priority]} className="uppercase">
                      {ticket.priority} priority
                    </Badge>
                    <Badge variant="outline">{statusLabels[ticket.status]}</Badge>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{emptyCopy}</p>
        )}

        <SmartLink href="/maintenance" className="inline-flex" intent="standard">
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            {ctaLabel}
          </Button>
        </SmartLink>
      </CardContent>
    </Card>
  )
}
