import * as React from "react"

import { cn } from "@/lib/utils"

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-[pulse_0.35s_ease-in-out_infinite] rounded-md bg-muted/60",
        className,
      )}
      {...props}
    />
  )
}
