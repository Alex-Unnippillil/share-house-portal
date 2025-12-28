"use client"

import { usePathname } from "next/navigation"

import SmartLink from "@/components/navigation/SmartLink"
import { cn } from "@/lib/utils"
import {
  CalendarRange,
  CreditCard,
  LayoutDashboard,
  MessageSquareText,
  type LucideIcon,
} from "lucide-react"

interface BottomNavItem {
  href: string
  label: string
  icon: LucideIcon
  matchExact?: boolean
}

const NAV_ITEMS: BottomNavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/payments",
    label: "Payments",
    icon: CreditCard,
  },
  {
    href: "/bookings",
    label: "Bookings",
    icon: CalendarRange,
  },
  {
    href: "/messaging",
    label: "Messaging",
    icon: MessageSquareText,
  },
]

export function BottomNav() {
  const pathname = usePathname()

  if (!pathname) {
    return null
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 shadow-[0_-4px_12px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)",
      }}
    >
      <div className="mx-auto flex w-full max-w-md items-stretch justify-between gap-1 p-2">
        {NAV_ITEMS.map((item) => {
          const isActive = matchPath(pathname, item)
          const Icon = item.icon

          return (
            <SmartLink
              key={item.href}
              href={item.href}
              intent="navigation"
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-[0.7rem] font-medium uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "min-h-[56px] min-w-[56px]",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  "size-6",
                  isActive ? "text-primary" : undefined,
                )}
              />
              <span>{item.label}</span>
            </SmartLink>
          )
        })}
      </div>
    </nav>
  )
}

function matchPath(pathname: string, item: BottomNavItem) {
  if (item.matchExact) {
    return pathname === item.href
  }

  if (item.href === "/") {
    return pathname === "/"
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}
