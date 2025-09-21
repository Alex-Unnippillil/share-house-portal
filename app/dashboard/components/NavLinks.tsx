"use client"

import React from "react"
import {
  ChatBubbleIcon,
  CrumpledPaperIcon,
  PersonIcon,
} from "@radix-ui/react-icons"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const sidebarLinks = [
  {
    href: "/dashboard/community",
    text: "Community",
    Icon: ChatBubbleIcon,
  },
  {
    href: "/dashboard/members",
    text: "Members",
    Icon: PersonIcon,
  },
  {
    href: "/dashboard/todo",
    text: "Tasks",
    Icon: CrumpledPaperIcon,
  },
]

export default function NavLinks() {
  const pathname = usePathname()

  return (
    <div className="space-y-5">
      {sidebarLinks.map((link) => {
        const Icon = link.Icon
        const isActive = pathname === link.href

        return (
          <Link
            onClick={() => document.getElementById("sidebar-close")?.click()}
            href={link.href}
            key={link.href}
            className={cn(
              "flex items-center gap-2 rounded-sm p-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-gray-500 text-white shadow dark:bg-gray-700"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
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