"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Menu, Search } from "lucide-react"

import { getRoleNavigation, type PortalRole } from "@/config/navigation"
import { getRoleCue } from "@/lib/role-cues"
import { cn } from "@/lib/utils"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { SignOutButton } from "@/components/sign-out-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageContainer } from "@/components/ui/page-layout"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { siteConfig } from "@/config/site"

type PortalLayoutShellProps = {
  role: PortalRole
  children: ReactNode
}

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

function SidebarNavigation({ role }: { role: PortalRole }) {
  const pathname = usePathname()
  const navigation = getRoleNavigation(role)

  return (
    <nav className="space-y-6" aria-label="Portal sidebar">
      {navigation.sections.map((section) => (
        <section key={section.id} aria-labelledby={`portal-nav-${section.id}`}>
          <h2
            id={`portal-nav-${section.id}`}
            className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {section.title}
          </h2>
          <ul className="space-y-1">
            {section.items.map((item) => {
              const href = item.href ?? "/"

              return (
                <li key={`${item.title}-${href}`}>
                  <Link
                    href={href}
                    aria-current={isActiveRoute(pathname, href) ? "page" : undefined}
                    className={cn(
                      "block rounded-md border border-transparent px-3 py-2 text-sm transition",
                      isActiveRoute(pathname, href)
                        ? "border-primary/20 bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>{item.title}</span>
                      {item.badge ? (
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          {item.badge}
                        </Badge>
                      ) : null}
                    </div>
                    {item.subtitle ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.subtitle}</p>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </nav>
  )
}

export function PortalLayoutShell({ role, children }: PortalLayoutShellProps) {
  const roleCue = getRoleCue(role)
  const roleNavigation = getRoleNavigation(role)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <PageContainer variant="dashboard" className="py-3">
          <div className="flex items-center gap-3 lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Open navigation">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[320px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>{siteConfig.name}</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <SidebarNavigation role={role} />
                </div>
              </SheetContent>
            </Sheet>
            <p className="text-sm font-semibold">{siteConfig.name}</p>
            <Badge className={cn("ml-auto", roleCue.accentClassName)}>{roleNavigation.roleLabel}</Badge>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <div>
              <p className="text-sm font-semibold">{siteConfig.name}</p>
              <p className="text-xs text-muted-foreground">{roleCue.contextCopy}</p>
            </div>
            <Badge className={cn("ml-2", roleCue.accentClassName)}>{roleNavigation.roleLabel}</Badge>
            <div className="ml-auto flex w-full max-w-sm items-center gap-2">
              <Search className="size-4 text-muted-foreground" />
              <Input
                placeholder="Search portal"
                aria-label="Search portal"
                className="h-9"
              />
            </div>
            <div className="flex items-center gap-1">
              <NotificationCenter />
              <ThemeToggle />
              <SignOutButton variant="outline" size="sm">
                Account
              </SignOutButton>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2 lg:hidden">
            <Button variant="ghost" size="icon" aria-label="Search">
              <Search className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell className="size-4" />
            </Button>
            <ThemeToggle />
            <SignOutButton variant="outline" size="sm">
              Account
            </SignOutButton>
          </div>
        </PageContainer>
      </header>

      <div className="flex min-h-[calc(100vh-130px)]">
        <aside className="sticky top-[130px] hidden h-[calc(100vh-130px)] w-80 overflow-y-auto border-r px-4 py-6 lg:block">
          <SidebarNavigation role={role} />
        </aside>

        <main className="min-w-0 flex-1" aria-label="Portal content">
          <PageContainer variant="dashboard" className="py-8">
            <div className="mb-6" aria-label="Breadcrumb slot" />
            {children}
          </PageContainer>
        </main>
      </div>
    </div>
  )
}

export function TenantLayoutShell({ children }: { children: ReactNode }) {
  return <PortalLayoutShell role="tenant">{children}</PortalLayoutShell>
}

export function PropertyManagerLayoutShell({ children }: { children: ReactNode }) {
  return <PortalLayoutShell role="property_manager">{children}</PortalLayoutShell>
}

export function AdminLayoutShell({ children }: { children: ReactNode }) {
  return <PortalLayoutShell role="admin">{children}</PortalLayoutShell>
}
