import React from "react"

import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import type { PortalRole } from "@/types/rbac"

import NavLinks from "./NavLinks"
import SignOut from "./SignOut"

interface SideNavProps {
  role: PortalRole | null
  buildingName?: string | null
}

export default function SideNav({ role, buildingName }: SideNavProps) {
  return (
    <SideBar
      role={role}
      buildingName={buildingName}
      className="dark:bg-gradient-dark hidden flex-1 lg:block"
    />
  )
}

export const SideBar = ({
  className,
  role,
  buildingName,
}: SideNavProps & { className?: string }) => {
  return (
    <div className={className}>
      <div
        className={cn(
          "flex size-full flex-col space-y-5 lg:w-96 lg:border-r lg:p-10 "
        )}
      >
        <div className="flex-1 space-y-5">
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">Onyx Dash</h1>

              <ThemeToggle />
            </div>
            {buildingName && (
              <p className="text-sm text-muted-foreground">{buildingName}</p>
            )}
          </div>
          <NavLinks role={role} />
        </div>
        <div>
          <SignOut />
        </div>
      </div>
    </div>
  )
}