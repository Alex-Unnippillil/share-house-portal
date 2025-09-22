import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Performance dashboard fixture",
  robots: {
    index: false,
    follow: false,
  },
}

export default function PerfTestLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-muted/40">{children}</div>
}
