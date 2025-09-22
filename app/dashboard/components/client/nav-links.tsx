"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { type ComponentType } from "react"

import { cn } from "@/lib/utils"
import {
  CardStackIcon,
  ChatBubbleIcon,
  ClipboardIcon,
  FileTextIcon,
  MixerHorizontalIcon,
  PersonIcon,
} from "@radix-ui/react-icons"

export type NavLinkItem = {
  href: string
  label: string
  icon: "members" | "payments" | "documents" | "messaging" | "chores" | "supplies"
}

const iconMap: Record<NavLinkItem["icon"], ComponentType<{ className?: string }>> = {
  members: PersonIcon,
  payments: CardStackIcon,
  documents: FileTextIcon,
  messaging: ChatBubbleIcon,
  chores: ClipboardIcon,
  supplies: MixerHorizontalIcon,
}

interface NavLinksProps {
  links: NavLinkItem[]
  onNavigate?: () => void
}

export default function NavLinks({ links, onNavigate }: NavLinksProps) {
  const pathname = usePathname()

  return (
    <div className="space-y-5">
      {links.map((link) => {
        const Icon = iconMap[link.icon]
        const isActive =
          pathname === link.href || pathname.startsWith(`${link.href}/`)

        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-sm p-2 text-sm transition-colors",
              {
                "bg-gray-500 text-white dark:bg-gray-700": isActive,
                "text-muted-foreground hover:bg-muted": !isActive,
              }
            )}
          >
            <Icon className="size-4" />
            {link.label}
          </Link>
        )
      })}
    </div>
  )
}
