"use client"

import type { ComponentType } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { CrumpledPaperIcon, PersonIcon } from "@radix-ui/react-icons"

import { cn } from "@/lib/utils"
import type { DashboardNavItem } from "@/lib/data/dashboard-nav"
import { getDashboardNavLinks } from "@/lib/data/dashboard-nav"
import type { UserRole } from "@/lib/data/users"

interface NavLinksProps {
  role: UserRole
}

const iconComponents: Record<DashboardNavItem["icon"], ComponentType<{ className?: string }>> = {
  members: PersonIcon,
  payments: CrumpledPaperIcon,
  documents: CrumpledPaperIcon,
  messaging: CrumpledPaperIcon,
  chores: CrumpledPaperIcon,
  supplies: CrumpledPaperIcon,
}

export default function NavLinks({ role }: NavLinksProps) {
  const pathname = usePathname()
  const links = getDashboardNavLinks(role)

  return (
    <div className="space-y-5">
      {links.map((link) => {
        const Icon = iconComponents[link.icon]
        const isActive = pathname === link.href

        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => document.getElementById("sidebar-close")?.click()}
            className={cn("flex items-center gap-2 rounded-sm p-2", {
              " bg-gray-500 text-white dark:bg-gray-700": isActive,
            })}
          >
            <Icon />
            {link.text}
          </Link>
        )
      })}
    </div>
  )
}
