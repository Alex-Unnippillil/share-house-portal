import { Suspense, type ReactNode } from "react"

import { redirect } from "next/navigation"

import { ErrorBoundary } from "@/components/feedback/ErrorBoundary"
import { RouteSkeleton } from "@/components/feedback/RouteSkeleton"
import {
  AdminLayoutShell,
  PropertyManagerLayoutShell,
  TenantLayoutShell,
} from "@/components/layouts/portal-shells"
import { fetchMemberRole } from "@/lib/data/members"
import { createSupbaseServerClientReadOnly } from "@/utils/supaone"

function resolveShell(role: string | null, children: ReactNode) {
  if (role === "admin") {
    return <AdminLayoutShell>{children}</AdminLayoutShell>
  }

  if (role === "property_manager") {
    return <PropertyManagerLayoutShell>{children}</PropertyManagerLayoutShell>
  }

  return <TenantLayoutShell>{children}</TenantLayoutShell>
}

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupbaseServerClientReadOnly()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  const role = await fetchMemberRole(supabase as any, user.id)

  return resolveShell(
    role ?? null,
    <ErrorBoundary>
      <Suspense fallback={<RouteSkeleton />}>{children}</Suspense>
    </ErrorBoundary>
  )
}
