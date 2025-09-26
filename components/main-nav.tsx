"use client"

import * as React from "react"
import SmartLink from "@/components/navigation/SmartLink"
import { usePathname } from "next/navigation"

import { NavItem } from "@/types/nav"
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import { Icons } from "@/components/icons"

interface MainNavProps {
  items?: NavItem[]
}

export function MainNav({ items }: MainNavProps) {
  const pathname = usePathname()

  const isActivePath = React.useCallback(
    (href: string | undefined) => {
      if (!href || !pathname) {
        return false
      }

      if (href === "/") {
        return pathname === "/"
      }

      return pathname === href || pathname.startsWith(`${href}/`)
    },
    [pathname]
  )

  return (
        <div className="mr-2 hidden gap-4 md:flex md:gap-8">
      <SmartLink
        href="/"
        className="inline-flex"
        intent="navigation"
        aria-current={isActivePath("/") ? "page" : undefined}
      >
        <span className="flex items-center gap-2">
          <Icons.logo className="size-6 text-primary" />
          <div className="flex flex-col leading-tight">
            <span className="font-semibold">{siteConfig.name}</span>
            <span className="text-xs font-medium text-muted-foreground">www.roomsily</span>
          </div>
        </span>
      </SmartLink>
      {items?.length ? (
        <nav className="flex gap-6">
          {items?.map(
            (item, index) =>
              item.href && (
                <SmartLink
                  key={index}
                  href={item.href}
                  className={cn(
                    "flex items-center text-sm font-medium text-muted-foreground",
                    item.disabled && "cursor-not-allowed opacity-80"
                  )}
                  intent="navigation"
                  aria-current={
                    isActivePath(item.href) ? "page" : undefined
                  }
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
