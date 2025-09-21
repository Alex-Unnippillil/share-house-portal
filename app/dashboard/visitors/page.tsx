import { Metadata } from "next"

import { MainNav } from "@/app/dashboard/components/main-nav"
import { Search } from "@/app/dashboard/components/search"
import TeamSwitcher from "@/app/dashboard/components/team-switcher"
import { UserNav } from "@/app/dashboard/components/user-nav"
import { VisitorOversightTable } from "@/app/dashboard/components/visitor-oversight-table"
import { fetchVisitorApprovals, resolveAccessContext } from "@/app/dashboard/lib/data-sources"
import { createSupbaseServerClientReadOnly } from "@/utils/supaone"

export const metadata: Metadata = {
  title: "Visitor oversight",
  description: "Approve or reject overnight visitor requests across the portfolio.",
}

type VisitorsPageProps = {
  searchParams?: {
    building?: string
  }
}

export default async function VisitorsPage({ searchParams }: VisitorsPageProps) {
  const supabase = await createSupbaseServerClientReadOnly()
  const { context, activeBuilding } = await resolveAccessContext(
    supabase,
    searchParams?.building ?? null
  )

  const approvals = await fetchVisitorApprovals(context, activeBuilding.id)

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
          <h1 className="text-3xl font-bold">Visitor oversight</h1>
          <p className="text-sm text-muted-foreground">
            Review pending visitor stays, host notifications, and policy compliance.
          </p>
        </div>
        <VisitorOversightTable approvals={approvals} />
      </div>
    </div>
  )
}
