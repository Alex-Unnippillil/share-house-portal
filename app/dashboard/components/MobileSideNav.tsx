"use client"

import { useEffect } from "react"

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import type { PortalRole } from "@/types/rbac"

import { SideBar } from "./SideNav"

interface MobileSideNavProps {
  role: PortalRole | null
  buildingName?: string | null
}

export default function MobileSideNav({
  role,
  buildingName,
}: MobileSideNavProps) {
  useEffect(() => {
    const resizeListener = (e: UIEvent) => {
      const w = e.target as Window
      if (w.innerWidth >= 1024) {
        document.getElementById("sidebar-close")?.click()
      }
    }

    window.addEventListener("resize", resizeListener)
    return () => {
      window.removeEventListener("resize", resizeListener)
    }
  }, [])

  return (
    <Sheet>
      <SheetTrigger asChild id="toggle-sidebar">
        <span></span>
      </SheetTrigger>
      <SheetContent side={"left"} className="dark:bg-gradient-dark flex">
        <SideBar role={role} buildingName={buildingName} />
      </SheetContent>
    </Sheet>
  )
}