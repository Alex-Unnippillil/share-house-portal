import { describe, expect, it } from "vitest"

import {
  canAccessThread,
  canModerate,
  isStaffRole,
} from "@/lib/messages/permissions"
import type { ProfileSummary, ThreadWithRelations } from "@/types/messages"

describe("permissions", () => {
  const staffProfile: ProfileSummary = {
    id: "staff-1",
    full_name: "Manager",
    avatar_url: null,
    role: "property_manager",
    building_id: "building-1",
    unit_id: null,
  }

  const tenantProfile: ProfileSummary = {
    id: "tenant-1",
    full_name: "Tenant",
    avatar_url: null,
    role: "tenant",
    building_id: "building-1",
    unit_id: "unit-1",
  }

  const thread: Pick<ThreadWithRelations, "building_id" | "unit_id"> = {
    building_id: "building-1",
    unit_id: "unit-1",
  }

  it("identifies staff roles", () => {
    expect(isStaffRole("property_manager")).toBe(true)
    expect(isStaffRole("admin")).toBe(true)
    expect(isStaffRole("tenant")).toBe(false)
  })

  it("allows staff to moderate", () => {
    expect(canModerate(staffProfile.role)).toBe(true)
    expect(canModerate(tenantProfile.role)).toBe(false)
  })

  it("restricts thread access by unit", () => {
    expect(canAccessThread(tenantProfile, thread)).toBe(true)
    expect(canAccessThread(tenantProfile, { ...thread, unit_id: "unit-2" })).toBe(false)
    expect(
      canAccessThread(
        tenantProfile,
        {
          building_id: thread.building_id,
          unit_id: null,
        }
      )
    ).toBe(true)
  })

  it("prevents access for mismatched buildings", () => {
    expect(
      canAccessThread(tenantProfile, {
        building_id: "building-2",
        unit_id: thread.unit_id,
      })
    ).toBe(false)
  })

  it("allows staff to access any unit in the building", () => {
    expect(canAccessThread(staffProfile, thread)).toBe(true)
    expect(
      canAccessThread(staffProfile, {
        building_id: thread.building_id,
        unit_id: "different-unit",
      })
    ).toBe(true)
  })
})
