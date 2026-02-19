"use client"

import Link from "next/link"
import { Menu } from "lucide-react"
import { usePathname } from "next/navigation"

import { getRoleNavigation, type PortalRole } from "@/config/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

type PortalShellProps = {
  role: PortalRole
  children: React.ReactNode
}

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function PortalNavSections({ role, onNavigate }: { role: PortalRole; onNavigate?: () => void }) {
  const pathname = usePathname()
  const navigation = getRoleNavigation(role)

  return (
    <div className="space-y-5">
      {navigation.sections.map((section) => (
        <section key={section.id} className="space-y-2" aria-label={section.title}>
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.title}</p>
          <ul className="space-y-1">
            {section.items.map((item) => {
              if (!item.href) {
                return null
              }

              const isActive = isActiveRoute(pathname, item.href)

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex min-h-11 items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      isActive ? "border-primary bg-primary/10 text-foreground" : "border-transparent hover:border-border hover:bg-muted/70"
                    )}
                  >
                    <span>{item.title}</span>
                    {item.badge ? (
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

export function PortalShell({ role, children }: PortalShellProps) {
  const navigation = getRoleNavigation(role)

  return (
    <div className="app-backdrop min-h-screen w-full text-foreground">
      <a
        href="#portal-main-content"
        className="sr-only z-50 rounded-md bg-background px-3 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      <header className="border-b bg-background/80 px-4 py-3 backdrop-blur lg:px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Roomsily portal</p>
            <p className="text-xs text-muted-foreground">{navigation.roleLabel}</p>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="lg:hidden" aria-label="Open navigation menu">
                <Menu className="size-4" aria-hidden="true" />
                <span className="ml-2">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Portal navigation</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <PortalNavSections role={role} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-screen-2xl gap-6 px-4 py-6 lg:px-6">
        <aside className="hidden w-72 shrink-0 lg:block" aria-label="Portal navigation">
          <PortalNavSections role={role} />
        </aside>
        <main id="portal-main-content" className="min-w-0 flex-1" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  )
}
