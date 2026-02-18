"use client"

import { useEffect } from "react"

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

import { SideBar } from "./SideNav"

export default function MobileSideNav() {
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        document.getElementById("sidebar-close")?.click()
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <Sheet>
      <SheetTrigger asChild id="toggle-sidebar">
        <span />
      </SheetTrigger>
      <SheetContent side="left" className="dark:bg-gradient-dark flex w-[88%] max-w-sm p-0">
        <SideBar className="w-full" />
      </SheetContent>
    </Sheet>
  )
}
