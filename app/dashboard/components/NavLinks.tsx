"use client"

import React from "react"
import { PersonIcon, CrumpledPaperIcon } from "@radix-ui/react-icons"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import type { PortalRole } from "@/types/rbac"

interface NavLinksProps {
  role: PortalRole | null
}

const DASHBOARD_LINKS: Array<{
  href: string
  text: string
  Icon: typeof PersonIcon
  roles: PortalRole[]
}> = [
  {
    href: "/dashboard/members",
    text: "Members",
    Icon: PersonIcon,
    roles: ["property_manager", "admin"],
  },
  {
    href: "/dashboard/todo",
    text: "Todo",
    Icon: CrumpledPaperIcon,
    roles: ["tenant", "roommate", "property_manager", "admin"],
  },
]

export default function NavLinks({ role }: NavLinksProps) {
  const pathname = usePathname()

  const visibleLinks = DASHBOARD_LINKS.filter(
    (link) => !link.roles.length || (role && link.roles.includes(role))
  )

  if (!visibleLinks.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Your account does not have access to dashboard modules yet.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {visibleLinks.map((link) => {
        const Icon = link.Icon

        return (
          <Link
            onClick={() =>
              document.getElementById("sidebar-close")?.click()
            }
            href={link.href}
            key={link.href}
            className={cn(
              "flex items-center gap-2 rounded-sm p-2",
              {
                " bg-gray-500 text-white dark:bg-gray-700":
                  pathname === link.href,
              }
            )}
          >
            <Icon />
            {link.text}
          </Link>
        )
      })}
    </div>
  )
}