import { Suspense, type ReactNode } from "react"

import { ErrorBoundary } from "@/components/feedback/ErrorBoundary"
import { RouteSkeleton } from "@/components/feedback/RouteSkeleton"

export default function MdxLayout({ children }: { children: ReactNode }) {
  // Create any shared layout or styles here
  return (
    <div className="prose prose-headings:mt-8 prose-headings:font-semibold prose-headings:text-black prose-h1:text-5xl prose-h2:text-4xl prose-h3:text-3xl prose-h4:text-2xl prose-h5:text-xl prose-h6:text-lg dark:prose-headings:text-white container mx-auto px-4 py-8 text-justify">
      <ErrorBoundary>
        <Suspense fallback={<RouteSkeleton />}>{children}</Suspense>
      </ErrorBoundary>
    </div>
  )
}
