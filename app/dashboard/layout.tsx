import { type ReactNode } from "react"
import { redirect } from "next/navigation"
import { readUserSession } from "@/utils/actions"

import { RouteSkeleton } from "@/components/feedback/RouteSkeleton"
import {
  DashboardAsyncBoundary,
  DashboardMainPanel,
  DashboardShellFrame,
  DashboardSidebarRail,
} from "@/app/dashboard/components/layout-primitives"

import MobileSideNav from "./components/MobileSideNav"
import SideNav from "./components/SideNav"
import ToggleSidebar from "./components/ToggleSidebar"

export default async function Layout({ children }: { children: ReactNode }) {
  const { data: userSession } = await readUserSession()

  if (!userSession.session) {
    return redirect("/auth")
  }

  return (
    <DashboardShellFrame>
      <DashboardSidebarRail>
        <SideNav />
        <MobileSideNav />
      </DashboardSidebarRail>

      <DashboardMainPanel className="space-y-stack-lg">
        <ToggleSidebar />
        <DashboardAsyncBoundary fallback={<RouteSkeleton />}>
          {children}
        </DashboardAsyncBoundary>
      </DashboardMainPanel>
    </DashboardShellFrame>
  )
}
