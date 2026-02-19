"use client"

import { usePathname } from "next/navigation"

import SmartLink from "@/components/navigation/SmartLink"
import {
  getRoleNavigation,
  type PortalRole,
  type RoleNavItem,
} from "@/config/navigation"
import { cn } from "@/lib/utils"

type RoleNavListProps = {
  role?: PortalRole | null
  onNavigate?: () => void
  className?: string
  compact?: boolean
}

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavigationBadge({ active, badge }: { active: boolean; badge?: string }) {
  if (!badge) {
    return null
  }

  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        active
          ? "border-primary-foreground/60 bg-primary-foreground/20 text-primary-foreground"
          : "border-primary/40 bg-primary/10 text-primary"
      )}
    >
      {badge}
    </span>
  )
}

function NavigationLink({
  item,
  compact,
  onNavigate,
}: {
  item: RoleNavItem
  compact: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const href = item.href as string
  const isActive = isActiveRoute(pathname, href)

  return (
    <SmartLink
      onClick={onNavigate}
      href={href}
      aria-current={isActive ? "page" : undefined}
      intent="navigation"
      className={cn(
        "group relative flex items-center justify-between gap-3 rounded-md border-l-2 border-l-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none",
        compact ? "p-2.5" : "p-2 pr-3",
        isActive
          ? "border-l-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/95"
          : "text-foreground hover:border-l-primary/60 hover:bg-muted/90 focus-visible:border-l-primary/70 focus-visible:bg-muted"
      )}
    >
      <span className="min-w-0">
        <span className={cn("block truncate font-medium", compact ? "text-sm" : "text-sm")}>
          {item.title}
        </span>
        {!compact && item.subtitle ? (
          <span
            className={cn(
              "block truncate text-xs",
              isActive ? "text-primary-foreground/80" : "text-muted-foreground"
            )}
          >
            {item.subtitle}
          </span>
        ) : null}
      </span>

      <NavigationBadge active={isActive} badge={item.badge} />
    </SmartLink>
  )
}

export function RoleNavList({ role = "tenant", onNavigate, className, compact = false }: RoleNavListProps) {
  const navigation = getRoleNavigation(role)

  return (
    <div className={cn("space-y-5", className)}>
      {navigation.sections.map((section) => (
        <section key={section.id} className="space-y-2" aria-label={section.title}>
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground/90">{section.title}</p>
          <div className="space-y-1">
            {section.items
              .filter((link) => Boolean(link.href))
              .map((link) => (
                <NavigationLink
                  key={link.href}
                  item={link}
                  compact={compact}
                  onNavigate={onNavigate}
                />
              ))}
          </div>
        </section>
      ))}
    </div>
  )
}
