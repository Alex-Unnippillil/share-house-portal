import React, { ReactNode } from "react";
import SideNav from "./components/SideNav";
import ToggleSidebar from "./components/ToggleSidebar";
import MobileSideNav from "./components/MobileSideNav";
import { readUserSession } from "@/utils/actions";
import { redirect } from "next/navigation";

export default async function Layout({ children }: { children: ReactNode }) {
  const {
    data: { session, activeMembership },
  } = await readUserSession()

  if (!session) {
    return redirect("/auth")
  }

  if (!activeMembership) {
    return redirect("/onboarding?missingBuilding=1")
  }

  return (
    <div className="flex w-full ">
      <div className="flex h-screen flex-col">
        <SideNav
          role={activeMembership.role}
          buildingName={activeMembership.building_name}
        />
        <MobileSideNav
          role={activeMembership.role}
          buildingName={activeMembership.building_name}
        />
      </div>

      <div className="w-full space-y-5 bg-gray-100 p-5 sm:flex-1 sm:p-10 dark:bg-inherit">
        <ToggleSidebar />
        {children}
      </div>
    </div>
  )
}