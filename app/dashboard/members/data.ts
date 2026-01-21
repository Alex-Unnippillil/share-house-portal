import "server-only"

import { cache } from "react"

import type { Database } from "@/lib/supabase"
import { createSupbaseServerClientReadOnly } from "@/utils/supaone"

export type DashboardMember = {
  id: string
  name: string
  role: "admin" | "user"
  createdAt: string
  status: "active" | "resigned"
}

type MemberRow = Database["public"]["Tables"]["dashboard_members"]["Row"]

const FALLBACK_MEMBERS: DashboardMember[] = [
  {
    id: "fallback-admin-1",
    name: "Admin Member",
    role: "admin",
    createdAt: new Date().toISOString(),
    status: "active",
  },
  {
    id: "fallback-user-1",
    name: "Non Admin User",
    role: "user",
    createdAt: new Date().toISOString(),
    status: "active",
  },
  {
    id: "fallback-admin-2",
    name: "Administrator",
    role: "admin",
    createdAt: new Date().toISOString(),
    status: "resigned",
  },
  {
    id: "fallback-user-2",
    name: "Satoshi",
    role: "user",
    createdAt: new Date().toISOString(),
    status: "active",
  },
]

export function mapMemberRowToDashboard(row: MemberRow): DashboardMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    createdAt: row.created_at ?? new Date().toISOString(),
    status: row.status,
  }
}

export const getDashboardMembers = cache(async (): Promise<DashboardMember[]> => {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return FALLBACK_MEMBERS
  }

  try {
    const supabase = await createSupbaseServerClientReadOnly()
    const { data, error } = await supabase
      .from("dashboard_members")
      .select("*")
      .order("created_at", { ascending: false })

    if (error || !data?.length) {
      if (error) {
        console.error("Failed to load dashboard members from Supabase", error)
      }
      return FALLBACK_MEMBERS
    }

    return data.map(mapMemberRowToDashboard)
  } catch (error) {
    console.error("Unexpected error loading dashboard members", error)
    return FALLBACK_MEMBERS
  }
})
