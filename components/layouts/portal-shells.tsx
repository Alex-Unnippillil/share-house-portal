"use client"

import Link from "next/link"
import { Menu } from "lucide-react"

import { getNavigationItems } from "@/config/navigation"
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

type PortalShellProps = {
  role: PortalRole
  title: string
  subtitle: string
  children: React.ReactNode
}

const roleTheme: Record<PortalRole, string> = {
  tenant: "bg-brand-50 text-brand-900",
  property_manager: "bg-booking-confirmed/15 text-booking-confirmed",
  admin: "bg-maintenance-open/15 text-maintenance-open",
}

function ResponsiveNav({
  title,
  role,
}: {
  title: string
  role: PortalRole
}) {
  const navItems = getNavigationItems(role, { role, includeDisabled: true })

  return (
    <>
      <nav className="hidden w-72 shrink-0 border-r bg-muted/20 p-content-gutter lg:block">
        <p className="mb-stack-lg text-label-sm uppercase tracking-wide text-muted-foreground">
          Navigation
        </p>
        <ul className="space-y-stack-sm">
          {navItems.map((item) => (
            <li key={item.id}>
              <Link
                className={cn(
                  "block rounded-md px-3 py-2 text-body-sm text-foreground transition hover:bg-muted",
                  item.disabled && "pointer-events-none opacity-60"
                )}
                href={item.href}
                aria-disabled={item.disabled}
              >
                {item.title}
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
                <li key={item.id}>
                  <Link
                    className={cn(
                      "block rounded-md px-3 py-2 text-body-sm hover:bg-muted",
                      item.disabled && "pointer-events-none opacity-60"
                    )}
                    href={item.href}
                    aria-disabled={item.disabled}
                  >
                    {item.title}
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

function PortalShell({ role, title, subtitle, children }: PortalShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b p-content-gutter">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-display-lg text-foreground">{title}</h1>
            <p className="text-body-sm text-muted-foreground">{subtitle}</p>
          </div>
          <span
            className={cn("rounded-full px-3 py-1 text-label-sm", roleTheme[role])}
          >
            {role.replace("_", " ")}
          </span>
        </div>
      </header>
      <div className="flex min-h-[calc(100vh-108px)] flex-col lg:flex-row">
        <ResponsiveNav title={title} role={role} />
        <main className="flex-1 p-content-gutter">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-section">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export function TenantLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell
      role="tenant"
      title="Tenant Portal"
      subtitle="Track rent, amenities, and roommate updates."
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
    >
      {children}
    </PortalShell>
  )
}
