import { Suspense, type ReactNode } from "react"

import { ErrorBoundary } from "@/components/feedback/ErrorBoundary"
import { RouteSkeleton } from "@/components/feedback/RouteSkeleton"

export function LegalPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <article className="prose prose-slate dark:prose-invert prose-headings:scroll-mt-24 prose-a:underline prose-a:underline-offset-2 max-w-none">
        <ErrorBoundary>
          <Suspense fallback={<RouteSkeleton />}>{children}</Suspense>
        </ErrorBoundary>
      </article>
    </div>
  )
}
