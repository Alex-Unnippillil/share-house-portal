import Link from "next/link"

import { cn } from "@/lib/utils"

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const items = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/amenities", label: "Amenities" },
    { href: "/dashboard/members", label: "Members" },
    { href: "/dashboard/todo", label: "Tasks" },
  ]
  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}