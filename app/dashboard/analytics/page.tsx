import { Metadata } from "next"

import { BuildingAnalyticsChart } from "@/app/dashboard/components/building-analytics-chart"
import { MainNav } from "@/app/dashboard/components/main-nav"
import { RentCollectionCard } from "@/app/dashboard/components/rent-collection-card"
import { Search } from "@/app/dashboard/components/search"
import TeamSwitcher from "@/app/dashboard/components/team-switcher"
import { UserNav } from "@/app/dashboard/components/user-nav"
import {
  fetchBuildingAnalytics,
  fetchRentCollectionSummary,
  resolveAccessContext,
} from "@/app/dashboard/lib/data-sources"
import { createSupbaseServerClientReadOnly } from "@/utils/supaone"

export const metadata: Metadata = {
  title: "Building analytics",
  description: "Monitor performance metrics per building to inform operational planning.",
}

type AnalyticsPageProps = {
  searchParams?: {
    building?: string
  }
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const supabase = await createSupbaseServerClientReadOnly()
  const { context, activeBuilding } = await resolveAccessContext(
    supabase,
    searchParams?.building ?? null
  )

  const [analytics, rentSummary] = await Promise.all([
    fetchBuildingAnalytics(context, activeBuilding.id),
    fetchRentCollectionSummary(context, activeBuilding.id),
  ])

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
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Understand revenue, amenity utilisation, and maintenance workload for {activeBuilding.name}.
          </p>
        </div>
        <RentCollectionCard summary={rentSummary} />
        <BuildingAnalyticsChart analytics={analytics} />
      </div>
    </div>
  )
}
