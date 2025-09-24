import { beforeEach, describe, expect, it } from "vitest"
import { randomUUID } from "node:crypto"

import { fetchMemberProfile, fetchMemberRole, fetchMembersByUnit } from "@/lib/data/members"

import { getDatabasePool, getSupabaseClient, resetDatabase } from "../../setup/supabase-test-env"

async function insertAuthUser(id: string, email: string) {
  const pool = getDatabasePool()
  await pool.query("INSERT INTO auth.users (id, email) VALUES ($1, $2)", [id, email])
}

async function insertProfile({
  id,
  email,
  fullName,
  role,
  unitId,
}: {
  id: string
  email: string
  fullName: string
  role: string
  unitId?: string | null
}) {
  const pool = getDatabasePool()
  await pool.query(
    "INSERT INTO public.profiles (id, email, full_name, role, unit_id) VALUES ($1, $2, $3, $4, $5)",
    [id, email, fullName, role, unitId ?? null]
  )
}

describe("member data queries", () => {
  const supabase = () => getSupabaseClient() as unknown as any

  beforeEach(async () => {
    await resetDatabase()
  })

  describe("fetchMemberRole", () => {
    it("returns the member role when available", async () => {
      const memberId = randomUUID()
      await insertAuthUser(memberId, "tenant@example.com")
      await insertProfile({
        id: memberId,
        email: "tenant@example.com",
        fullName: "Tenant Example",
        role: "tenant",
        unitId: "unit-1",
      })

      const role = await fetchMemberRole(supabase(), memberId)

      expect(role).toBe("tenant")
    })

    it("throws when the query fails", async () => {
      const pool = getDatabasePool()
      const memberId = randomUUID()
      await insertAuthUser(memberId, "tenant@example.com")

      await pool.query("ALTER TABLE public.profiles RENAME TO profiles_backup;")

      try {
        await expect(fetchMemberRole(supabase(), memberId)).rejects.toThrow(/Failed to load member role/)
      } finally {
        await pool.query("ALTER TABLE public.profiles_backup RENAME TO profiles;")
      }
    })
  })

  describe("fetchMemberProfile", () => {
    it("returns profile data when present", async () => {
      const memberId = randomUUID()
      await insertAuthUser(memberId, "tenant@example.com")
      await insertProfile({
        id: memberId,
        email: "tenant@example.com",
        fullName: "Tenant Example",
        role: "tenant",
        unitId: "unit-1",
      })

      const profile = await fetchMemberProfile(supabase(), memberId)

      expect(profile).toEqual({
        id: memberId,
        email: "tenant@example.com",
        full_name: "Tenant Example",
        role: "tenant",
        unit_id: "unit-1",
      })
    })

    it("throws when the query fails", async () => {
      const pool = getDatabasePool()
      const memberId = randomUUID()
      await insertAuthUser(memberId, "tenant@example.com")

      await pool.query("ALTER TABLE public.profiles RENAME TO profiles_backup;")

      try {
        await expect(fetchMemberProfile(supabase(), memberId)).rejects.toThrow(/Failed to load member profile/)
      } finally {
        await pool.query("ALTER TABLE public.profiles_backup RENAME TO profiles;")
      }
    })
  })

  describe("fetchMembersByUnit", () => {
    it("applies filters and returns members", async () => {
      const unitId = "unit-1"
      const tenantId = randomUUID()
      const roommateId = randomUUID()
      const otherUnitMember = randomUUID()

      await insertAuthUser(tenantId, "tenant@example.com")
      await insertAuthUser(roommateId, "roommate@example.com")
      await insertAuthUser(otherUnitMember, "other@example.com")

      await insertProfile({
        id: tenantId,
        email: "tenant@example.com",
        fullName: "Tenant Example",
        role: "tenant",
        unitId,
      })
      await insertProfile({
        id: roommateId,
        email: "roommate@example.com",
        fullName: "Roommate Example",
        role: "roommate",
        unitId,
      })
      await insertProfile({
        id: otherUnitMember,
        email: "other@example.com",
        fullName: "Other Unit",
        role: "tenant",
        unitId: "unit-2",
      })

      const members = await fetchMembersByUnit(supabase(), unitId, {
        excludeUserId: roommateId,
        roles: ["tenant"],
      })

      expect(members).toEqual([
        {
          id: tenantId,
          email: "tenant@example.com",
          full_name: "Tenant Example",
          role: "tenant",
          unit_id: unitId,
        },
      ])
    })

    it("throws when the query fails", async () => {
      const pool = getDatabasePool()

      await pool.query("ALTER TABLE public.profiles RENAME TO profiles_backup;")

      try {
        await expect(fetchMembersByUnit(supabase(), "unit-1")).rejects.toThrow(/Failed to load members for unit/)
      } finally {
        await pool.query("ALTER TABLE public.profiles_backup RENAME TO profiles;")
      }
    })
  })
})
