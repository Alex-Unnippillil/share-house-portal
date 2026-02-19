"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Menu } from "lucide-react"

import { roleNavigation, type PortalRole } from "@/config/navigation"
import { NavItemRow } from "@/components/navigation/nav-item-row"
import { getRoleCue } from "@/lib/role-cues"
import { cn } from "@/lib/utils"
import { uiLayerTokens } from "@/components/ui/layer-styles"
import { Button } from "@/components/ui/button"
import { PageContainer } from "@/components/ui/page-layout"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/"
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

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
        className={cn("hidden w-72 shrink-0 border-r p-content-gutter lg:block", uiLayerTokens.navChrome)}
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
                    ? "bg-primary/10 text-foreground"
                    : "text-foreground hover:bg-muted/70"
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
      <div className={cn("border-b p-content-gutter lg:hidden", uiLayerTokens.navChrome)}>
        <Sheet>
          <SheetTrigger asChild>
            <Button size="sm" variant="outline">
              <Menu className="mr-2 size-4" />
              Menu
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className={cn("w-72", uiLayerTokens.navChrome)}>
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
                        ? "bg-primary/10 text-foreground"
                        : "hover:bg-muted/70"
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
      <header className="border-b p-content-gutter">
        <a
          href="#main-content"
          className="sr-only z-50 rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Skip to content
        </a>
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
        <div className="flex-1">
          <PageContainer variant="dashboard" className="flex flex-col gap-section">
            {children}
          </PageContainer>
        </div>
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
