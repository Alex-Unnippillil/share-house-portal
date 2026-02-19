import { cva } from "class-variance-authority"

export const dashboardTableContainerClass =
  "overflow-hidden rounded-lg border border-border/60 bg-card"

export const dashboardTableRowVariants = cva(
  "grid grid-cols-5 items-center gap-3 px-4 py-3 text-sm transition-colors",
  {
    variants: {
      density: {
        compact: "min-h-12",
        regular: "min-h-14",
      },
      active: {
        true: "bg-muted/70 ring-1 ring-inset ring-primary/30",
        false: "border-t border-border/40 hover:bg-muted/40",
      },
    },
    defaultVariants: {
      density: "regular",
      active: false,
    },
  },
)

export const dashboardStatusBadgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
  {
    variants: {
      tone: {
        success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        warning: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        danger: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
        neutral: "border-border bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
)

export const dashboardFormStackClass = "space-y-4"

export const dashboardEmptyStateClass =
  "flex min-h-40 items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 text-center text-sm text-muted-foreground"
