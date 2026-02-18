import { type ReactNode } from "react"

import { LegalPageLayout } from "@/components/legal-page-layout"

export default function DataRetentionLayout({
  children,
}: {
  children: ReactNode
}) {
  return <LegalPageLayout>{children}</LegalPageLayout>
}
