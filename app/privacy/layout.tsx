import { type ReactNode } from "react"

import { LegalPageLayout } from "@/components/legal-page-layout"

export default function PrivacyLayout({ children }: { children: ReactNode }) {
  return <LegalPageLayout>{children}</LegalPageLayout>
}
