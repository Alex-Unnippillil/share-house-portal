import * as React from "react"
import SmartLink from "@/components/navigation/SmartLink"

import { siteConfig } from "@/config/site"
import { getNavigationItems } from "@/config/navigation"
import { cn } from "@/lib/utils"
import { Icons } from "@/components/icons"

export function MainNav() {
  const items = getNavigationItems("public", {
    role: "public",
    includeDisabled: true,
  })

  return (
    <div className="mr-2 hidden gap-4 md:flex md:gap-8">
      <SmartLink href="/" className="inline-flex" intent="navigation">
        <span className="flex items-center gap-2">
          <Icons.logo className="size-6 text-primary" />
          <div className="flex flex-col leading-tight">
            <span className="font-semibold">{siteConfig.name}</span>
            <span className="text-xs font-medium text-muted-foreground">www.roomsily</span>
          </div>
        </span>
      </SmartLink>
      {items.length ? (
        <nav className="flex gap-6">
          {items.map((item) => (
            <SmartLink
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center text-sm font-medium text-muted-foreground",
                item.disabled && "pointer-events-none cursor-not-allowed opacity-80"
              )}
              intent="navigation"
              aria-disabled={item.disabled}
            >
              {item.title}
            </SmartLink>
          ))}
        </nav>
      ) : null}
    </div>
  )
}
