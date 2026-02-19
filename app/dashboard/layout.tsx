import { Suspense, type ReactNode } from "react"
import { redirect } from "next/navigation"
import { readUserSession } from "@/utils/actions"

import { ErrorBoundary } from "@/components/feedback/ErrorBoundary"
import { RouteSkeleton } from "@/components/feedback/RouteSkeleton"
import { PageContainer } from "@/components/ui/page-layout"

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const { data: userSession } = await readUserSession()

  if (!userSession.session) {
    return redirect("/auth")
  }

  return (
    <div className="app-backdrop w-full border border-border/70 text-foreground">
      <PageContainer variant="dashboard">
        <ErrorBoundary>
          <Suspense fallback={<RouteSkeleton />}>{children}</Suspense>
        </ErrorBoundary>
      </PageContainer>
    </div>
  )
}
