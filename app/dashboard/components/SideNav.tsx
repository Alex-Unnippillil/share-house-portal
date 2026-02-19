import React from "react"

import { ThemeToggle } from "@/components/theme-toggle"
import { getRoleNavigation, type PortalRole } from "@/config/navigation"
import { cn } from "@/lib/utils"

import NavLinks from "./NavLinks"
import SignOut from "./SignOut"

type SideNavProps = {
  role?: PortalRole | null
}

type SideBarProps = {
  className?: string
  onNavigate?: () => void
  role?: PortalRole | null
}

export default function SideNav({ role = "tenant" }: SideNavProps) {
  return <SideBar className="dark:bg-gradient-dark hidden flex-1 lg:block" role={role} />
}

export const SideBar = ({ className, onNavigate, role = "tenant" }: SideBarProps) => {
  const { roleLabel } = getRoleNavigation(role)

  return (
    <div className={className}>
      <div
        className={cn(
          "flex size-full flex-col rounded-2xl border border-border/60 bg-background/85 p-6 shadow-2xl backdrop-blur-xl lg:w-96 lg:p-10 [&_a]:min-h-11 [&_a]:px-3 [&_a]:py-2 [&_a]:text-base"
        )}
      >
        <div className="sticky top-0 z-10 -mx-1 mb-5 flex items-start justify-between gap-3 border-b border-border/70 bg-background/95 px-1 pb-4 pt-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div>
            <h1 className="text-3xl font-semibold">Roomsily</h1>
            <p className="text-sm text-muted-foreground">www.roomsily household hub</p>
            <p className="mt-2 inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
              {roleLabel}
            </p>
          </div>

          <ThemeToggle />
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto pr-1">
          <NavLinks onNavigate={onNavigate} role={role} />
        </div>

        <div className="mt-5 border-t border-border/70 pt-4">
          <SignOut />
        </div>
      </div>
    </div>
  )
}
