import Link from "next/link"

import { cn } from "@/lib/utils"

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      <Link
        href="/dashboard"
        className="text-sm font-medium transition-colors hover:text-primary"
      >
        Overview
      </Link>
      <Link
        href="/dashboard/payments"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Payments
      </Link>
      <Link
        href="/dashboard/members"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Members
      </Link>
      <Link
        href="/dashboard/todo"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Tasks
      </Link>
    </nav>
  )
}