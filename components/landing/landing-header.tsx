"use client"

import type { MouseEvent } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"

import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useActiveSection } from "@/components/landing/use-active-section"
import { LANDING_SECTION_IDS } from "@/components/landing/landing-ids"

const navItems = [
  { id: LANDING_SECTION_IDS.features, label: "Features" },
  { id: LANDING_SECTION_IDS.personas, label: "Roles" },
  { id: LANDING_SECTION_IDS.integrations, label: "Integrations" },
  { id: LANDING_SECTION_IDS.workflow, label: "How it works" },
  { id: LANDING_SECTION_IDS.finalCta, label: "Contact" },
] as const

export default function LandingHeader() {
  const pathname = usePathname()
  const activeSection = useActiveSection({
    sectionIds: navItems.map((item) => item.id),
  })

  const handleAnchorClick = (
    event: MouseEvent<HTMLAnchorElement>,
    sectionId: string
  ) => {
    if (pathname !== "/") {
      return
    }

    event.preventDefault()

    const section = document.getElementById(sectionId)
    if (!section) {
      return
    }

    section.scrollIntoView({ behavior: "smooth", block: "start" })
    window.history.replaceState(null, "", `/#${sectionId}`)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="layout-content flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="rounded-md text-sm font-semibold text-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Roomsily
        </Link>

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Landing sections"
        >
          {navItems.map((item) => {
            const isActive = activeSection === item.id

            return (
              <Link
                key={item.id}
                href={`/#${item.id}`}
                onClick={(event) => handleAnchorClick(event, item.id)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href={siteConfig.links.login}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "font-medium"
            )}
          >
            Sign in
          </Link>
          <Link
            href={siteConfig.links.signup}
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Start onboarding
          </Link>
        </div>

        <Sheet>
          <SheetTrigger
            className="inline-flex size-9 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] sm:max-w-sm">
            <SheetHeader>
              <SheetTitle>Navigate Roomsily</SheetTitle>
              <SheetDescription>
                Jump to sections or continue onboarding.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-2">
              {navItems.map((item) => (
                <SheetClose key={item.id} asChild>
                  <Link
                    href={`/#${item.id}`}
                    onClick={(event) => handleAnchorClick(event, item.id)}
                    className={cn(
                      "flex rounded-md px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      activeSection === item.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                </SheetClose>
              ))}
            </div>
            <div className="mt-8 grid gap-3">
              <SheetClose asChild>
                <Link
                  href={siteConfig.links.signup}
                  className={cn(buttonVariants({ size: "sm" }), "w-full")}
                >
                  Start onboarding
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link
                  href={siteConfig.links.login}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "w-full"
                  )}
                >
                  Sign in
                </Link>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
