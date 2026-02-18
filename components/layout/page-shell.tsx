import type { ReactNode } from "react"

import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type PageShellProps = {
  title: string
  description: string
  children: ReactNode
  action?: ReactNode
  className?: string
  maxWidthClassName?: string
}

export function PageShell({
  title,
  description,
  children,
  action,
  className,
  maxWidthClassName = "max-w-7xl",
}: PageShellProps) {
  return (
    <div className={cn("container space-y-8 py-8 sm:py-10", maxWidthClassName, className)}>
      <header className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
            <p className="max-w-3xl text-base text-muted-foreground sm:text-lg">{description}</p>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        <Separator />
      </header>
      {children}
    </div>
  )
}
