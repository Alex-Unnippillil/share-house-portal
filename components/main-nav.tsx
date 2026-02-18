"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import SmartLink from "@/components/navigation/SmartLink"
import { Icons } from "@/components/icons"
import { cn } from "@/lib/utils"
import { NavItem } from "@/types/nav"

interface MainNavProps {
  appName: string
  items?: NavItem[]
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
      <SmartLink href="/" className="inline-flex" intent="navigation">
        <span className="flex items-center gap-2">
          <Icons.logo className="size-6 text-primary" />
          <div className="flex flex-col leading-tight">
            <span className="font-semibold">{appName}</span>
            <span className="text-xs font-medium text-muted-foreground">www.roomsily</span>
          </div>
        </span>
      </SmartLink>
      {items?.length ? (
        <nav aria-label="Primary" className="flex gap-2">
          {items.map(
            (item) =>
              item.href && (
                <SmartLink
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    item.disabled && "cursor-not-allowed opacity-80",
                    isActiveRoute(pathname, item.href)
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  intent="navigation"
                >
                  {item.title}
                </SmartLink>
              )
          )}
        </nav>
      ) : null}
    </div>
  )
}
