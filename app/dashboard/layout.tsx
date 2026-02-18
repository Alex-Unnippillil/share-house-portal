import { Suspense, type ReactNode } from "react"

import { redirect } from "next/navigation"

import { ErrorBoundary } from "@/components/feedback/ErrorBoundary"
import { RouteSkeleton } from "@/components/feedback/RouteSkeleton"
import { readUserSession } from "@/utils/actions"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { data: userSession } = await readUserSession()

  if (!userSession.session) {
    return redirect("/auth")
  }

  return (
    <div className="w-full bg-muted/20 px-4 py-6 sm:px-6 lg:px-10">
      <ErrorBoundary>
        <Suspense fallback={<RouteSkeleton />}>{children}</Suspense>
      </ErrorBoundary>
    </div>
  )
}
