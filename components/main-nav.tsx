"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import SmartLink from "@/components/navigation/SmartLink"
import { NavItemRow } from "@/components/navigation/nav-item-row"
import { Icons } from "@/components/icons"
import { cn } from "@/lib/utils"
import { NavItem } from "@/types/nav"

type MainNavEntry = NavItem & {
  subtitle?: string
  badge?: string
}

interface MainNavProps {
  appName: string
  items?: MainNavEntry[]
}


function isActiveRoute(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function MainNav({ appName, items }: MainNavProps) {
  const pathname = usePathname()

  return (
    <div className="mr-2 hidden gap-4 lg:flex lg:gap-8">
      <SmartLink
        href="/"
        className="inline-flex rounded-md px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        intent="navigation"
      >
        <span className="flex items-center gap-2">
          <Icons.logo className="size-6 text-primary" />
          <div className="flex flex-col leading-tight">
            <span className="font-semibold">{appName}</span>
            <span className="text-xs font-medium text-muted-foreground">www.roomsily</span>
          </div>
        </span>
      </SmartLink>
      {items?.length ? (
        <nav aria-label="Primary" className="flex gap-1 rounded-lg border border-border/60 bg-background/80 p-1">
          {items.map(
            (item) =>
              item.href && (
                <SmartLink
                  key={item.href}
                  href={item.href}
                  aria-current={isActiveRoute(pathname, item.href) ? "page" : undefined}
                  className={cn(
                    "rounded-md border px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    item.disabled && "cursor-not-allowed opacity-80",
                    isActiveRoute(pathname, item.href)
                      ? "border-primary/30 bg-primary/10 text-foreground"
                      : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  intent="navigation"
                >
                  <NavItemRow
                    title={item.title}
                    subtitle={item.subtitle}
                    badge={item.badge}
                    icon={item.icon}
                    className="min-w-[180px]"
                  />
                </SmartLink>
              )
          )}
        </nav>
      ) : null}
    </div>
  )
}
