"use client"

import { useEffect, useState, type MouseEvent } from "react"
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
  { id: LANDING_SECTION_IDS.workflow, label: "How it works" },
  { id: LANDING_SECTION_IDS.finalCta, label: "Get started" },
] as const

export default function LandingHeader() {
  const pathname = usePathname()
  const activeSection = useActiveSection({
    sectionIds: navItems.map((item) => item.id),
  })
  const [scrolled, setScrolled] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const nextScrolled = window.scrollY > 10
      setScrolled(nextScrolled)

      const documentElement = document.documentElement
      const scrollable = documentElement.scrollHeight - window.innerHeight
      if (scrollable <= 0) {
        setScrollProgress(0)
        return
      }

      const progress = Math.min(1, Math.max(0, window.scrollY / scrollable))
      setScrollProgress(progress)
    }

    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

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

    const shouldReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    section.scrollIntoView({ behavior: shouldReduceMotion ? "auto" : "smooth", block: "start" })
    window.history.replaceState(null, "", `/#${sectionId}`)
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl transition duration-300",
        scrolled && "border-border/80 bg-background/95 shadow-sm"
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-primary/10" aria-hidden="true">
        <span
          className="block h-full bg-gradient-to-r from-primary/50 via-primary to-primary/50 transition-[width] duration-150"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        Skip to content
      </a>
      <div className="layout-content flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="rounded-md text-sm font-semibold text-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Roomsily
        </Link>

        <nav
          className="hidden items-center gap-1 rounded-xl border border-border/60 bg-background/80 p-1 md:flex"
          aria-label="Landing sections"
        >
          {navItems.map((item) => {
            const isActive = activeSection === item.id

            return (
              <Link
                key={item.id}
                href={`/#${item.id}`}
                onClick={(event) => handleAnchorClick(event, item.id)}
                aria-current={isActive ? "location" : undefined}
                className={cn(
                  "relative rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  isActive
                    ? "bg-primary/10 text-primary after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:rounded-full after:bg-primary"
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
              "font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            )}
          >
            Sign in
          </Link>
          <Link
            href={siteConfig.links.signup}
            className={cn(buttonVariants({ size: "sm" }), "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2")}
          >
            Start onboarding
          </Link>
        </div>

        <Sheet>
          <SheetTrigger
            className="inline-flex size-9 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:hidden"
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
                    aria-current={activeSection === item.id ? "location" : undefined}
                    className={cn(
                      "relative flex min-h-10 items-center rounded-md border-l-2 border-transparent px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      activeSection === item.id
                        ? "border-l-primary bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                </SheetClose>
              ))}
            </div>
            <div className="mt-8 grid gap-3 border-t border-border/70 pt-4">
              <SheetClose asChild>
                <Link
                  href={siteConfig.links.signup}
                  className={cn(buttonVariants({ size: "sm" }), "w-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2")}
                >
                  Start onboarding
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link
                  href={siteConfig.links.login}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "w-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
