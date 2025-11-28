"use client"

import { AppProgressBar as ProgressBar } from "next-nprogress-bar"

export function TopProgressBar() {
  return (
    <ProgressBar
      height="3px"
      color="hsl(var(--primary))"
      options={{ showSpinner: false }}
      shallowRouting
      delay={200}
    />
  )
}
