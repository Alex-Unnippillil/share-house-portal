import { Suspense, type ReactNode } from "react"

import { cn } from "@/lib/utils"
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary"

type ClassNameProps = {
  className?: string
  children: ReactNode
}

/**
 * Dashboard root shell with sidebar + content regions.
 *
 * Breakpoint behavior:
 * - Mobile/tablet: sidebar is hidden by default and opened through the sheet trigger.
 * - `lg` and up: persistent sidebar column appears and the content region stretches full height.
 */
export function DashboardShellFrame({ children, className }: ClassNameProps) {
  return <div className={cn("flex w-full", className)}>{children}</div>
}

export function DashboardSidebarRail({ children, className }: ClassNameProps) {
  return (
    <aside className={cn("flex h-screen flex-col", className)}>
      {children}
    </aside>
  )
}

export function DashboardMainPanel({ children, className }: ClassNameProps) {
  return (
    <main
      className={cn(
        "w-full bg-muted/20 p-content-gutter sm:flex-1 dark:bg-inherit",
        className
      )}
    >
      {children}
    </main>
  )
}

export function DashboardSectionStack({ children, className }: ClassNameProps) {
  return (
    <div className={cn("flex flex-col gap-section", className)}>{children}</div>
  )
}

export function DashboardCardGrid({ children, className }: ClassNameProps) {
  return (
    <div className={cn("grid gap-card-gap md:grid-cols-2", className)}>
      {children}
    </div>
  )
}

export function DashboardAsyncBoundary({
  children,
  fallback,
  className,
}: {
  children: ReactNode
  fallback: ReactNode
  className?: string
}) {
  return (
    <ErrorBoundary>
      <Suspense fallback={fallback}>
        <div className={className}>{children}</div>
      </Suspense>
    </ErrorBoundary>
  )
}
