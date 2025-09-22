"use client"

import { useEffect } from "react"

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import NavLinks from "./NavLinks"
import { ThemeToggle } from "@/components/theme-toggle"
import SignOut from "./SignOut"
import type { UserRole } from "@/lib/data/users"

interface MobileSideNavProps {
  role: UserRole
}

export default function MobileSideNav({ role }: MobileSideNavProps) {
  useEffect(() => {
    const handler = (event: UIEvent) => {
      const target = event.target as Window
      if (target.innerWidth >= 1024) {
        document.getElementById("sidebar-close")?.click()
      }
    }

    window.addEventListener("resize", handler)
    return () => {
      window.removeEventListener("resize", handler)
    }
  }, [])

  return (
    <Sheet>
      <SheetTrigger asChild id="toggle-sidebar">
        <span />
      </SheetTrigger>
      <SheetContent side="left" className="flex dark:bg-gradient-dark">
        <div className="flex size-full flex-col space-y-5">
          <div className="flex flex-1 flex-col space-y-5">
            <div className="flex items-center gap-2">
              <div>
                <h1 className="text-3xl font-semibold">Roomsily</h1>
                <p className="text-sm text-muted-foreground">www.roomsily household hub</p>
              </div>
              <ThemeToggle />
            </div>
            <NavLinks role={role} />
          </div>
          <div>
            <SignOut />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
