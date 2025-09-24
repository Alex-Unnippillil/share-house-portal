import type { Database } from "@/lib/supabase"

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"]
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"]
export type ProfileRole = ProfileRow["role"]

export type NormalizedScimUser = {
  id?: string
  userName: string
  email: string
  fullName: string | null
  active: boolean
  externalId: string | null
  role: ProfileRole
  metadata: Record<string, unknown>
}

export type TenantExtension = {
  role?: ProfileRole | null
}

export type ScimListQuery = {
  startIndex: number
  itemsPerPage: number
  filter?: { field: "id" | "userName"; value: string }
}
