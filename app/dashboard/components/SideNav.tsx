import React from "react"

import type { PortalRole } from "@/config/navigation"
import { getRoleCue } from "@/lib/role-cues"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"

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

export default function SideNav({ role }: SideNavProps) {
  return (
    <SideBar
      role={role}
      className="dark:bg-gradient-dark hidden flex-1 lg:block"
    />
  )
}

export const SideBar = ({ className, onNavigate, role }: SideBarProps) => {
  const roleCue = getRoleCue(role)

  return (
    <div className={className}>
      <div
        className={cn(
          "flex size-full flex-col space-y-5 rounded-2xl border border-border/60 bg-background/85 p-6 shadow-2xl backdrop-blur-xl lg:w-96 lg:p-10 [&_a]:min-h-11 [&_a]:px-3 [&_a]:py-2 [&_a]:text-base"
        )}
      >
        <div className="flex-1 space-y-5">
          <div
            className={cn(
              "space-y-3 rounded-xl p-3",
              roleCue.accentClassName,
              "role-cue-surface"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h1 className="text-3xl font-semibold">Roomsily</h1>
                <p className="text-sm text-muted-foreground">
                  www.roomsily household hub
                </p>
              </div>
              <ThemeToggle />
            </div>
            <span className="role-cue-badge">{roleCue.roleLabel}</span>
            <p className="text-xs text-muted-foreground">
              {roleCue.contextCopy}
            </p>
          </div>
          <NavLinks onNavigate={onNavigate} role={roleCue.role} />
        </div>
        <div>
          <SignOut />
        </div>
      </div>
    </div>
  )
}
