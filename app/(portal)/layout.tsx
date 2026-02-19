import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { PortalShell } from "@/components/layouts/portal-shell"
import type { PortalRole } from "@/config/navigation"
import { fetchMemberRole } from "@/lib/data/members"
import { readUserSession } from "@/utils/actions"
import { createSupbaseServerClientReadOnly } from "@/utils/supaone"

async function resolvePortalRole(userId: string): Promise<PortalRole> {
  const supabase = await createSupbaseServerClientReadOnly()
  const role = await fetchMemberRole(supabase as never, userId)

  if (role === "property_manager" || role === "admin" || role === "roommate") {
    return role
  }

  return "tenant"
}

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const { data: userSession } = await readUserSession()

  if (!userSession.session?.user.id) {
    redirect("/auth")
  }

  const role = await resolvePortalRole(userSession.session.user.id)

  return <PortalShell role={role}>{children}</PortalShell>
}
