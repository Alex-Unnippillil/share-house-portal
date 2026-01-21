import { getMaintenanceTickets } from "../data"
import { MaintenanceOverviewCardClient } from "./maintenance-overview-card.client"

export async function MaintenanceOverviewCard() {
  const tickets = await getMaintenanceTickets()
  return <MaintenanceOverviewCardClient tickets={tickets} />
}
