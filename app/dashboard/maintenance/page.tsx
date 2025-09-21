import { Metadata } from "next"

import { MainNav } from "@/app/dashboard/components/main-nav"
import { MaintenanceBacklogCard } from "@/app/dashboard/components/maintenance-backlog-card"
import { MaintenanceRequestTable } from "@/app/dashboard/components/maintenance-request-table"
import { Search } from "@/app/dashboard/components/search"
import TeamSwitcher from "@/app/dashboard/components/team-switcher"
import { UserNav } from "@/app/dashboard/components/user-nav"
import { fetchMaintenanceQueue, resolveAccessContext } from "@/app/dashboard/lib/data-sources"
import { createSupbaseServerClientReadOnly } from "@/utils/supaone"

export const metadata: Metadata = {
  title: "Maintenance triage",
  description: "Prioritise and assign maintenance requests per building.",
}

type MaintenancePageProps = {
  searchParams?: {
    building?: string
  }
}

export default async function MaintenancePage({ searchParams }: MaintenancePageProps) {
  const supabase = await createSupbaseServerClientReadOnly()
  const { context, activeBuilding } = await resolveAccessContext(
    supabase,
    searchParams?.building ?? null
  )

  const maintenanceQueue = await fetchMaintenanceQueue(context, activeBuilding.id)

  return (
    <div className="xs:flex max-w-dvw w-full flex-col">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <TeamSwitcher
            buildings={context.buildings}
            selectedBuildingId={activeBuilding.id}
            role={context.profile.role}
          />
          <MainNav className="mx-6" buildingId={activeBuilding.id} role={context.profile.role} />
          <div className="ml-auto flex items-center space-x-4">
            <Search buildingName={activeBuilding.name} />
            <UserNav />
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Maintenance triage</h1>
          <p className="text-sm text-muted-foreground">
            Manage open tickets, track assignments, and ensure high priority issues are resolved quickly.
          </p>
        </div>
        <MaintenanceBacklogCard queue={maintenanceQueue} />
        <MaintenanceRequestTable queue={maintenanceQueue} />
      </div>
    </div>
  )
}
