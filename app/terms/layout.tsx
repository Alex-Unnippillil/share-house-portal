import { type ReactNode } from "react"

import { LegalPageLayout } from "@/components/legal-page-layout"

export default function TermsLayout({ children }: { children: ReactNode }) {
  return <LegalPageLayout>{children}</LegalPageLayout>
}
