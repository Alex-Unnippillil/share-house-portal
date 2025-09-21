"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  label: string
  disabled?: boolean
}

type MainNavProps = React.HTMLAttributes<HTMLElement> & {
  items: NavItem[]
}

export function MainNav({ className, items, ...props }: MainNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      {items.map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-disabled={item.disabled}
            tabIndex={item.disabled ? -1 : 0}
            className={cn(
              "text-sm font-medium transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-primary",
              item.disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}