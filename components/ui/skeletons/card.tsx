import * as React from "react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

export type CardSkeletonVariant = "generic" | "metric" | "list"

export interface CardSkeletonProps extends React.ComponentProps<typeof Card> {
  variant?: CardSkeletonVariant
  /** Number of placeholder lines for the generic variant. */
  lines?: number
}

export function CardSkeleton({
  variant = "generic",
  lines = 3,
  className,
  ...props
}: CardSkeletonProps) {
  if (variant === "metric") {
    return (
      <Card
        role="status"
        aria-busy="true"
        aria-live="polite"
        className={cn("overflow-hidden", className)}
        {...props}
      >
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-1/2" />
        </CardContent>
      </Card>
    )
  }

  if (variant === "list") {
    return (
      <Card
        role="status"
        aria-busy="true"
        aria-live="polite"
        className={cn("overflow-hidden", className)}
        {...props}
      >
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Skeleton className="h-4 w-24" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn("space-y-4 p-6", className)}
      {...props}
    >
      {Array.from({ length: Math.max(lines, 1) }).map((_, index) => (
        <Skeleton key={index} className="h-4 w-full" />
      ))}
    </Card>
  )
}
