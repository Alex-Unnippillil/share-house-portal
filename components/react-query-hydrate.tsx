"use client"

import { HydrationBoundary, type HydrationBoundaryProps } from "@tanstack/react-query"

export function ReactQueryHydrate(props: HydrationBoundaryProps) {
  return <HydrationBoundary {...props} />
}
