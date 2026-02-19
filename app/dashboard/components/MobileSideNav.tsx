"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { HamburgerMenuIcon } from "@radix-ui/react-icons"

import type { PortalRole } from "@/config/navigation"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

import { SideBar } from "./SideNav"

export default function MobileSideNav({ role }: { role?: PortalRole | null }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    const handleWindowResize = () => {
      if (window.innerWidth >= 1024) {
        setOpen(false)
      }
    }

    window.addEventListener("resize", handleWindowResize)
    return () => {
      window.removeEventListener("resize", handleWindowResize)
    }
  }, [])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open navigation menu"
          aria-haspopup="dialog"
          aria-expanded={open}
          className="inline-flex min-h-11 items-center justify-center rounded-md px-3 py-2 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden surface-glass"
        >
          <HamburgerMenuIcon className="size-5" aria-hidden="true" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex dark:bg-gradient-dark surface-glass"
      >
        <SideBar role={role} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
