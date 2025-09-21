"use server"

import { createSupbaseServerClient, createSupbaseServerClientReadOnly } from "../supaone"
import type { TenantMembership } from "@/types/tenant"

export async function readUserSession() {
  const supabase = await createSupbaseServerClientReadOnly()

  return supabase.auth.getSession()
}

export async function readUserContext() {
  const supabase = await createSupbaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return { session: null, profile: null, tenants: [] as TenantMembership[] }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, company, email")
    .eq("id", session.user.id)
    .maybeSingle()

  const { data: memberships } = await supabase
    .from("permission_table")
    .select("id, member_id, role, status")
    .eq("member_id", session.user.id)
    .order("created_at", { ascending: true })

  const tenants: TenantMembership[] = (memberships ?? []).map((membership, index) => ({
    id: membership.id.toString(),
    name:
      membership.status?.replace(/_/g, " ")?.replace(/\b\w/g, (char) => char.toUpperCase()) ||
      profile?.company ||
      `Workspace ${index + 1}`,
    role: membership.role || profile?.role || "member",
    status: membership.status,
  }))

  if (!tenants.length) {
    tenants.push({
      id: session.user.id,
      name: profile?.company ?? profile?.full_name ?? "Personal",
      role: profile?.role ?? (session.user.app_metadata?.role as string | undefined) ?? "user",
      status: "default",
    })
  }

  return { session, profile, tenants }
}
