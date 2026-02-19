"use client"

import { Menu } from "lucide-react"

import { roleNavigation, type PortalRole } from "@/config/navigation"
import { RoleNavList } from "@/components/navigation/role-nav-list"
import { getRoleCue } from "@/lib/role-cues"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PageContainer } from "@/components/ui/page-layout"
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
  return (
    <>
      <nav
        className="hidden w-72 shrink-0 border-r bg-muted/20 p-content-gutter lg:block"
        aria-label="Portal"
      >
        <p className="mb-stack-lg text-label-sm uppercase tracking-wide text-muted-foreground">
          Navigation
        </p>
        <RoleNavList role={role} compact />
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
            <div className="mt-stack-lg">
              <RoleNavList role={role} compact />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}

function PortalShell({ role, title, subtitle, children }: PortalShellProps) {
  const roleCue = getRoleCue(role)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b p-content-gutter">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-display-lg text-foreground">{title}</h1>
            <p className="text-body-sm text-muted-foreground">{subtitle}</p>
            <p
              className={cn(
                "mt-1 text-xs",
                roleCue.accentClassName,
                "role-cue-heading"
              )}
            >
              {roleCue.contextCopy}
            </p>
          </div>
          <span className={cn("role-cue-badge", roleCue.accentClassName)}>
            {roleNavigation[role].roleLabel}
          </span>
        </div>
      </header>
      <div className="flex min-h-[calc(100vh-108px)] flex-col lg:flex-row">
        <ResponsiveNav title={title} role={role} />
        <main className="flex-1">
          <PageContainer variant="dashboard" className="flex flex-col gap-section">
            {children}
          </PageContainer>
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
