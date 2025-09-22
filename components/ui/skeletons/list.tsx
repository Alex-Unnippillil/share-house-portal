import * as React from "react"

import { cn } from "@/lib/utils"

import { CardSkeleton, CardSkeletonProps } from "./card"

export interface ListSkeletonProps
  extends React.HTMLAttributes<HTMLDivElement> {
  count?: number
  variant?: CardSkeletonProps["variant"]
  cardProps?: Omit<CardSkeletonProps, "variant"> & { key?: never }
}

export function ListSkeleton({
  count = 3,
  variant = "list",
  cardProps,
  className,
  ...props
}: ListSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn("space-y-4", className)}
      {...props}
    >
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} variant={variant} {...cardProps} />
      ))}
    </div>
  )
}
