import { redirect } from "next/navigation"

import { PortalShell } from "@/components/layouts/portal-shells"
import type { PortalRole } from "@/config/navigation"
import { fetchMemberRole } from "@/lib/data/members"
import { readUserSession } from "@/utils/actions"
import { createClient } from "@/utils/supabase/server"

const portalTitles: Record<PortalRole, { title: string; subtitle: string }> = {
  tenant: {
    title: "Tenant Portal",
    subtitle: "Track rent, amenities, and roommate updates.",
  },
  roommate: {
    title: "Roommate Portal",
    subtitle: "Stay aligned on payments, reservations, and shared updates.",
  },
  property_manager: {
    title: "Property Manager Workspace",
    subtitle: "Oversee bookings, maintenance, and tenant activity.",
  },
  admin: {
    title: "Admin Back Office",
    subtitle: "Reconcile payments, compliance, and platform health.",
  },
}

export async function AuthenticatedRouteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const {
    data: { session },
  } = await readUserSession()

  if (!session) {
    redirect("/auth")
  }

  const supabase = await createClient()
  const resolvedRole = await fetchMemberRole(supabase as never, session.user.id)
  const role: PortalRole =
    resolvedRole === "tenant" ||
    resolvedRole === "roommate" ||
    resolvedRole === "property_manager" ||
    resolvedRole === "admin"
      ? resolvedRole
      : "tenant"

  return (
    <PortalShell role={role} title={portalTitles[role].title} subtitle={portalTitles[role].subtitle}>
      {children}
    </PortalShell>
  )
}
