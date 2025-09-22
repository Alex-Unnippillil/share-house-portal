import * as React from "react"
import Link from "next/link"

import { NavItem } from "@/types/nav"
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import { Icon } from "@/components/icons"

interface MainNavProps {
  items?: NavItem[]
}

export function MainNav({ items }: MainNavProps) {
  return (
        <div className="mr-2 hidden gap-4 md:flex md:gap-8">
      <Link href="/" className="flex items-center gap-2">
        <Icon name="logo" className="size-6 text-primary" aria-hidden />
        <div className="flex flex-col leading-tight">
          <span className="font-semibold">{siteConfig.name}</span>
          <span className="text-xs font-medium text-muted-foreground">www.roomsily</span>
        </div>
      </Link>
      {items?.length ? (
        <nav className="flex gap-6">
          {items?.map(
            (item, index) =>
              item.href && (
                <Link
                  key={index}
                  href={item.href}
                  className={cn(
                    "flex items-center text-sm font-medium text-muted-foreground",
                    item.disabled && "cursor-not-allowed opacity-80"
                  )}
                >
                  {item.title}
                </Link>
              )
          )}
        </nav>
      ) : null}
    </div>
  )
}
