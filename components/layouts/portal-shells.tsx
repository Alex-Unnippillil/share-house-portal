"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, useReducedMotion } from "framer-motion"
import { Menu } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

type PortalRole = "tenant" | "property_manager" | "admin"

export type PortalNavItem = {
  href: string
  label: string
}

type PortalShellProps = {
  role: PortalRole
  title: string
  subtitle: string
  navItems: PortalNavItem[]
  children: React.ReactNode
}

const roleTheme: Record<PortalRole, string> = {
  tenant: "bg-brand-50 text-brand-900",
  property_manager: "bg-booking-confirmed/15 text-booking-confirmed",
  admin: "bg-maintenance-open/15 text-maintenance-open",
}

function ResponsiveNav({
  title,
  navItems,
}: {
  title: string
  navItems: PortalNavItem[]
}) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href || pathname.startsWith(`${href}/`)
    }

    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const itemClassName = (active: boolean) =>
    cn(
      "relative block rounded-md px-3 py-2 text-body-sm transition-colors",
      active
        ? "bg-primary/10 text-primary"
        : "text-foreground hover:bg-muted"
    )

  return (
    <>
      <nav className="hidden w-72 shrink-0 border-r bg-muted/20 p-content-gutter lg:block">
        <p className="mb-stack-lg text-label-sm uppercase tracking-wide text-muted-foreground">
          Navigation
        </p>
        <ul className="space-y-stack-sm">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                aria-current={isActive(item.href) ? "page" : undefined}
                className={itemClassName(isActive(item.href))}
                href={item.href}
              >
                {isActive(item.href) ? (
                  <motion.span
                    layoutId="portal-shell-active-nav"
                    className="absolute inset-0 -z-10 rounded-md border border-primary/20 bg-primary/10"
                    transition={{ type: "spring", stiffness: 360, damping: 30 }}
                  />
                ) : null}
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-b p-content-gutter lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="sm" variant="outline">
              <Menu className="mr-2 size-4" />
              Menu
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle>{title} Navigation</SheetTitle>
            </SheetHeader>
            <ul className="mt-stack-lg space-y-stack-sm">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={itemClassName(isActive(item.href))}
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}

function PortalShell({
  role,
  title,
  subtitle,
  navItems,
  children,
}: PortalShellProps) {
  const reduceMotion = useReducedMotion()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b p-content-gutter">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-display-lg text-foreground">{title}</h1>
            <p className="text-body-sm text-muted-foreground">{subtitle}</p>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-label-sm",
              roleTheme[role]
            )}
          >
            {role.replace("_", " ")}
          </span>
        </div>
      </header>
      <div className="flex min-h-[calc(100vh-108px)] flex-col lg:flex-row">
        <ResponsiveNav title={title} navItems={navItems} />
        <main className="flex-1 p-content-gutter">
          <motion.div
            className="mx-auto flex w-full max-w-6xl flex-col gap-section"
            initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={
              reduceMotion
                ? undefined
                : {
                    duration: 0.22,
                    ease: "easeOut",
                  }
            }
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}

const tenantNav: PortalNavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/payments", label: "Payments" },
  { href: "/bookings", label: "Amenity bookings" },
  { href: "/documents", label: "Documents" },
  { href: "/messaging", label: "Message board" },
]

const managerNav: PortalNavItem[] = [
  { href: "/dashboard", label: "Portfolio overview" },
  { href: "/maintenance", label: "Maintenance queue" },
  { href: "/visitors", label: "Visitor approvals" },
  { href: "/bookings", label: "Amenity operations" },
  { href: "/documents", label: "Lease workflows" },
]

const adminNav: PortalNavItem[] = [
  { href: "/dashboard", label: "Admin analytics" },
  { href: "/payments", label: "Rent reconciliation" },
  { href: "/documents", label: "Compliance docs" },
  { href: "/messaging", label: "Moderation" },
  { href: "/maintenance", label: "Escalations" },
]

export function TenantLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell
      role="tenant"
      title="Tenant Portal"
      subtitle="Track rent, amenities, and roommate updates."
      navItems={tenantNav}
    >
      {children}
    </PortalShell>
  )
}

export function PropertyManagerLayoutShell({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PortalShell
      role="property_manager"
      title="Property Manager Workspace"
      subtitle="Oversee bookings, maintenance, and tenant activity."
      navItems={managerNav}
    >
      {children}
    </PortalShell>
  )
}

export function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell
      role="admin"
      title="Admin Back Office"
      subtitle="Reconcile payments, compliance, and platform health."
      navItems={adminNav}
    >
      {children}
    </PortalShell>
  )
}
