"use client"

import { CrumpledPaperIcon, PersonIcon } from "@radix-ui/react-icons"
import { usePathname } from "next/navigation"

import SmartLink from "@/components/navigation/SmartLink"
import { getRoleNavigation, type PortalRole } from "@/config/navigation"
import { cn } from "@/lib/utils"

type NavLinksProps = {
  onNavigate?: () => void
  role?: PortalRole | null
}

const iconByHref = {
  "/dashboard/members": PersonIcon,
} as const

export default function NavLinks({ onNavigate, role }: NavLinksProps) {
  const pathname = usePathname()
  const navigation = getRoleNavigation(role)

  return (
    <div className="space-y-2">
      {navigation.primaryNav.filter((link) => Boolean(link.href)).map((link) => {
        const href = link.href as string
        const Icon = iconByHref[href as keyof typeof iconByHref] ?? CrumpledPaperIcon
        const isActive = pathname === href || pathname.startsWith(`${href}/`)

        return (
          <SmartLink
            key={href}
            onClick={onNavigate}
            href={href}
            intent="navigation"
            className={cn(
              "flex items-center gap-2 rounded-sm p-2 motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none",
              isActive
                ? "bg-primary/90 text-primary-foreground hover:bg-primary"
                : "text-foreground hover:bg-muted/70"
            )}
          >
            <span className="flex items-center gap-2">
              <Icon />
              <span>{link.title}</span>
            </span>
          </SmartLink>
        )
      })}
    </div>
  )
}
