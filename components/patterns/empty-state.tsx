import { type ReactNode } from "react"
import { type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  primaryAction?: ReactNode
  secondaryAction?: ReactNode
  className?: string
  compact?: boolean
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 text-center",
        compact ? "gap-3 px-6 py-8" : "gap-4 px-8 py-12",
        className,
      )}
    >
      <div className="rounded-full bg-primary/10 p-3 text-primary" aria-hidden>
        <Icon className={cn(compact ? "size-5" : "size-6")} />
      </div>

      <div className={cn("space-y-1", compact ? "max-w-sm" : "max-w-md")}>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {primaryAction || secondaryAction ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {primaryAction}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  )
}
