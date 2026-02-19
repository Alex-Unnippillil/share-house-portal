import { Suspense, type ReactNode } from "react"
import { redirect } from "next/navigation"

import type { PortalRole } from "@/config/navigation"
import { fetchMemberRole } from "@/lib/data/members"
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary"
import { RouteSkeleton } from "@/components/feedback/RouteSkeleton"
import { PortalLayoutShell } from "@/components/layouts/portal-shells"
import { readUserSession } from "@/utils/actions"
import { createSupbaseServerClientReadOnly } from "@/utils/supaone"

const roleFallback: PortalRole = "tenant"

function normalizeRole(role: string | null): PortalRole {
  if (role === "tenant" || role === "roommate" || role === "property_manager" || role === "admin") {
    return role
  }

  return roleFallback
}

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const {
    data: { session },
  } = await readUserSession()

  if (!session) {
    redirect("/auth")
  }

  const supabase = await createSupbaseServerClientReadOnly()
  const role = normalizeRole(await fetchMemberRole(supabase as any, session.user.id))

  return (
    <PortalLayoutShell role={role}>
      <ErrorBoundary>
        <Suspense fallback={<RouteSkeleton />}>{children}</Suspense>
      </ErrorBoundary>
    </PortalLayoutShell>
  )
}
