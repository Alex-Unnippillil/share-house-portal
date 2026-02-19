"use client"

import { Menu } from "lucide-react"

import { roleNavigation, type PortalRole } from "@/config/navigation"
import { NavItemRow } from "@/components/navigation/nav-item-row"
import { getRoleCue } from "@/lib/role-cues"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

type PortalShellProps = {
  role: PortalRole
  title: string
  subtitle: string
  children: React.ReactNode
}

function ResponsiveNav({ title, role }: { title: string; role: PortalRole }) {
  const pathname = usePathname()
  const navItems = roleNavigation[role].primaryNav.map((item) => ({
    href: item.href ?? "/",
    title: item.title,
    subtitle: item.subtitle,
    badge: item.badge,
    icon: item.icon,
  }))

  return (
    <>
      <nav
        className="hidden w-72 shrink-0 border-r bg-muted/20 p-content-gutter lg:block"
        aria-label="Portal"
      >
        <p className="mb-stack-lg text-label-sm uppercase tracking-wide text-muted-foreground">
          Workspace
        </p>
        <ul className="space-y-stack-sm">
          {navItems.map((item) => (
            <li key={`${item.href}-${item.title}`}>
              <Link
                className={cn(
                  "block rounded-md border px-3 py-2 text-body-sm transition-colors",
                  isActiveRoute(pathname, item.href)
                    ? "border-primary/30 bg-primary/10 text-foreground"
                    : "border-transparent text-foreground hover:bg-muted"
                )}
                href={item.href}
                aria-current={isActiveRoute(pathname, item.href) ? "page" : undefined}
              >
                <NavItemRow title={item.title} subtitle={item.subtitle} badge={item.badge} icon={item.icon} />
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
                <li key={`${item.href}-${item.title}`}>
                  <Link
                    className={cn(
                      "block rounded-md border px-3 py-2 text-body-sm transition-colors",
                      isActiveRoute(pathname, item.href)
                        ? "border-primary/30 bg-primary/10 text-foreground"
                        : "border-transparent text-foreground hover:bg-muted"
                    )}
                    href={item.href}
                    aria-current={isActiveRoute(pathname, item.href) ? "page" : undefined}
                  >
                    <NavItemRow title={item.title} subtitle={item.subtitle} badge={item.badge} icon={item.icon} />
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

export function PortalShell({ role, title, subtitle, children }: PortalShellProps) {
  const roleCue = getRoleCue(role)

  return (
    <div className="min-h-screen bg-background">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-body-sm focus:shadow">
        Skip to main content
      </a>
      <header className="sticky top-0 z-30 border-b bg-background/95 p-content-gutter backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-label-sm uppercase tracking-wide text-muted-foreground">Share House Portal</p>
            <h1 className="text-heading-lg text-foreground">{title}</h1>
            <p className="text-body-sm text-muted-foreground">{subtitle}</p>
            <p className={cn("mt-1 text-label-sm", roleCue.accentClassName, "role-cue-heading")}>
              {roleCue.contextCopy}
            </p>
          </div>
          <span className={cn("role-cue-badge", roleCue.accentClassName)}>
            {roleNavigation[role].roleLabel}
          </span>
        </div>
      </header>
      <div className="flex min-h-[calc(100vh-120px)] flex-col lg:flex-row">
        <ResponsiveNav title={title} role={role} />
        <main id="main-content" className="min-w-0 flex-1 py-section">
          {children}
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
