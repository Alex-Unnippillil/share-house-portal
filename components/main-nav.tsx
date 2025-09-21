import * as React from "react"
import Link from "next/link"

import { NavItem } from "@/types/nav"
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import { Icons } from "@/components/icons"

interface MainNavProps {
  items?: NavItem[]
  className?: string
}

export function MainNav({ items, className }: MainNavProps) {
  return (
    <div className={cn("mr-2 hidden items-center gap-4 md:flex md:gap-8", className)}>
      <Link href="/" className="flex items-center space-x-2">
        <Icons.logo className="size-6" />
        <span className="inline-block font-bold">{siteConfig.name}</span>
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
                  {item.label ? (
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {item.label}
                    </span>
                  ) : null}
                </Link>
              )
          )}
        </nav>
      ) : null}
    </div>
  )
}
