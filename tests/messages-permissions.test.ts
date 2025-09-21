import { describe, expect, it } from "vitest"

import {
  canModerateThread,
  filterThreadsByAssignments,
} from "@/lib/messages/permissions"
import type { TenantAssignmentRow, ThreadWithRelations } from "@/types/messages"

describe("message permissions", () => {
  const now = new Date().toISOString()
  const thread: ThreadWithRelations = {
    id: "thread-1",
    building_id: "building-1",
    unit_id: "unit-1",
    created_at: now,
    updated_at: now,
    created_by: "user-1",
    title: "Kitchen",
    category: "general",
    metadata: {},
    pinned_message_id: null,
    is_locked: false,
    created_by_profile: null,
    messages: [],
  }

  const tenantAssignment: TenantAssignmentRow = {
    id: "assign-1",
    profile_id: "user-2",
    building_id: "building-1",
    unit_id: "unit-1",
    role: "tenant",
    created_at: now,
  }

  const managerAssignment: TenantAssignmentRow = {
    id: "assign-2",
    profile_id: "manager-1",
    building_id: "building-1",
    unit_id: null,
    role: "property_manager",
    created_at: now,
  }

  it("filters threads by assignment", () => {
    const visible = filterThreadsByAssignments([thread], [tenantAssignment])
    expect(visible).toHaveLength(1)
  })

  it("prevents access when assignment is missing", () => {
    const otherAssignment: TenantAssignmentRow = {
      ...tenantAssignment,
      building_id: "other-building",
    }
    const visible = filterThreadsByAssignments([thread], [otherAssignment])
    expect(visible).toHaveLength(0)
  })

  it("grants moderation rights to property managers", () => {
    const canModerate = canModerateThread(thread, [managerAssignment])
    expect(canModerate).toBe(true)
  })

  it("denies moderation for regular tenants", () => {
    const canModerate = canModerateThread(thread, [tenantAssignment])
    expect(canModerate).toBe(false)
  })
})
