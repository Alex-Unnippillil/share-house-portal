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
        href="/message-board"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Message Board
      </Link>
      <Link
        href="/dashboard/message-board/moderation"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Moderation
      </Link>
      <Link
        href="/dashboard/members"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Members
      </Link>
    </nav>
  )
}