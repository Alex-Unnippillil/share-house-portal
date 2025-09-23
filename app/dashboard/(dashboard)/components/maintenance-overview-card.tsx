import SmartLink from "@/components/navigation/SmartLink"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getMaintenanceTickets } from "../data"
import { Wrench } from "lucide-react"
import { MaintenanceTicketItem } from "./maintenance-ticket-item"

export async function MaintenanceOverviewCard() {
  const tickets = await getMaintenanceTickets()

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wrench className="size-5 text-primary" />
            Maintenance snapshot
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Track active work orders from your property team.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-3">
          {tickets.map((ticket) => (
            <MaintenanceTicketItem key={ticket.id} ticket={ticket} />
          ))}
        </ul>

        <SmartLink href="/maintenance" className="inline-flex" intent="standard">
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            View maintenance queue
          </Button>
        </SmartLink>
      </CardContent>
    </Card>
  )
}
