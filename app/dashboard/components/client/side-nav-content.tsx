"use client"

import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"

import NavLinks, { type NavLinkItem } from "./nav-links"
import SignOutButton from "./sign-out-button"

interface SideNavContentProps {
  links: NavLinkItem[]
  className?: string
  onNavigate?: () => void
}

export default function SideNavContent({
  links,
  className,
  onNavigate,
}: SideNavContentProps) {
  return (
    <div className={cn(className)}>
      <div className="flex size-full flex-col space-y-5 lg:w-96 lg:border-r lg:p-10">
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-3xl font-semibold">Roomsily</h1>
              <p className="text-sm text-muted-foreground">
                www.roomsily household hub
              </p>
            </div>
            <ThemeToggle />
          </div>
          <NavLinks links={links} onNavigate={onNavigate} />
        </div>
        <div className="mt-auto">
          <SignOutButton />
        </div>
      </div>
    </div>
  )
}
