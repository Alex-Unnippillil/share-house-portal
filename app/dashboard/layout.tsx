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
    <div className="app-backdrop w-full border border-border/70 px-dashboard-x py-dashboard-y text-foreground sm:px-dashboard-x-sm lg:px-dashboard-x-lg">
      <ErrorBoundary>
        <Suspense fallback={<RouteSkeleton />}>{children}</Suspense>
      </ErrorBoundary>
    </div>
  )
}
