"use server"

import { cookies } from "next/headers"

import { resolveActiveMembership } from "@/lib/auth/authorization"
import type { BuildingMembership } from "@/types/rbac"

import { createSupbaseServerClientReadOnly } from "../supaone"

interface UserRolesRow {
  building_id: string
  building_slug: string
  building_name: string
  role: BuildingMembership["role"]
  created_at: string | null
}

export async function readUserSession() {
  const supabase = await createSupbaseServerClientReadOnly()

  const sessionResponse = await supabase.auth.getSession()
  const session = sessionResponse.data.session

  let memberships: BuildingMembership[] = []

  if (session?.user) {
    const { data: membershipRows } = await supabase
      .from("user_roles")
      .select("building_id, building_slug, building_name, role, created_at")
      .order("building_name")

    memberships = (membershipRows ?? []).map((membership: UserRolesRow) => ({
      building_id: membership.building_id,
      building_slug: membership.building_slug,
      building_name: membership.building_name,
      role: membership.role,
      created_at: membership.created_at ?? undefined,
    }))
  }

  const cookieStore = cookies()
  const fallbackBuildingId = cookieStore.get("active-building")?.value ?? null

  const activeMembership = resolveActiveMembership({
    memberships,
    fallbackBuildingId,
  })

  if (activeMembership && activeMembership.building_id !== fallbackBuildingId) {
    cookieStore.set({
      name: "active-building",
      value: activeMembership.building_id,
      path: "/",
      sameSite: "lax",
    })
  }

  if (!activeMembership && fallbackBuildingId) {
    cookieStore.set({
      name: "active-building",
      value: "",
      path: "/",
      sameSite: "lax",
    })
  }

  return {
    data: {
      session,
      user: session?.user ?? null,
      memberships,
      activeMembership,
    },
    error: sessionResponse.error,
  }
}