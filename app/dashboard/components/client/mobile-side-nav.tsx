"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { HamburgerMenuIcon } from "@radix-ui/react-icons"

import SideNavContent from "./side-nav-content"
import { type NavLinkItem } from "./nav-links"

interface MobileSideNavProps {
  links: NavLinkItem[]
}

export default function MobileSideNav({ links }: MobileSideNavProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setOpen(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="block lg:hidden">
          <HamburgerMenuIcon className="size-4" />
          <span className="sr-only">Toggle navigation</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="dark:bg-gradient-dark flex">
        <SideNavContent
          className="flex-1"
          links={links}
          onNavigate={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  )
}
