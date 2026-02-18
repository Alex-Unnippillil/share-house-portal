"use client"

import { useEffect } from "react"

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

import { SideBar } from "./SideNav"

export default function MobileSideNav() {
  useEffect(() => {
    const handleResize = (event: UIEvent) => {
      const resizedWindow = event.target as Window
      if (resizedWindow.innerWidth >= 1024) {
        document.getElementById("sidebar-close")?.click()
      }
    }

    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <Sheet>
      <SheetTrigger asChild id="toggle-sidebar">
        <span aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left" className="dark:bg-gradient-dark flex">
        <SideBar />
      </SheetContent>
    </Sheet>
  )
}
