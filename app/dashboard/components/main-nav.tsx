"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"

const NAV_ITEMS: Array<{
  href: string
  label: string
  roles?: string[]
}> = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/maintenance", label: "Maintenance" },
  { href: "/dashboard/visitors", label: "Visitors" },
  { href: "/dashboard/documents", label: "Documents" },
  { href: "/dashboard/analytics", label: "Analytics", roles: ["admin"] },
]

type MainNavProps = React.HTMLAttributes<HTMLElement> & {
  buildingId?: string
  role: string | null
}

export function MainNav({ className, buildingId, role, ...props }: MainNavProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const baseParams = new URLSearchParams(searchParams.toString())

  if (buildingId) {
    baseParams.set("building", buildingId)
  } else {
    baseParams.delete("building")
  }

  const queryString = baseParams.toString()

  return (
    <nav className={cn("flex items-center space-x-4 lg:space-x-6", className)} {...props}>
      {NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role ?? "")).map((item) => {
        const href = queryString ? `${item.href}?${queryString}` : item.href
        const isActive = pathname === item.href

        return (
          <Link
            key={item.href}
            href={href}
            className={cn(
              "text-sm font-medium transition-colors",
              isActive ? "text-foreground" : "text-muted-foreground hover:text-primary"
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}