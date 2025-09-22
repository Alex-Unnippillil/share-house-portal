import type { ReactNode } from "react"
import { notFound } from "next/navigation"

import { ensureFeatureEnabled } from "@/lib/features"

interface AdminLayoutProps {
  children: ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const { enabled } = await ensureFeatureEnabled({
    key: "feature_management",
    fallbackToDefault: true,
  })

  if (!enabled) {
    notFound()
  }

  return <>{children}</>
}
