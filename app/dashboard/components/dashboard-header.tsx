import { MainNav } from "./main-nav"
import { Search } from "./search"
import TeamSwitcher from "./team-switcher"
import { UserNav } from "./user-nav"
import type { BuildingAccess } from "../lib/types"

type DashboardHeaderProps = {
  buildings: BuildingAccess[]
  activeBuildingId: string
  activeBuildingName: string
  navItems: { label: string; href: string }[]
}

export function DashboardHeader({
  buildings,
  activeBuildingId,
  activeBuildingName,
  navItems,
}: DashboardHeaderProps) {
  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        <TeamSwitcher
          buildings={buildings}
          activeBuildingId={activeBuildingId}
          className="mr-4"
        />
        <MainNav className="mx-6" items={navItems} />
        <div className="ml-auto flex items-center space-x-4">
          <Search buildingName={activeBuildingName} />
          <UserNav />
        </div>
      </div>
    </div>
  )
}

