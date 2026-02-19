import {
  pickRoleFixture,
  roleSwitchFixture,
} from "@/tests/mocks/role-switch-fixture"
import { describe, expect, it } from "vitest"

import { getRoleCue, normalizePortalRole } from "@/lib/role-cues"

describe("role cues", () => {
  it("normalizes unknown values to tenant", () => {
    expect(normalizePortalRole("unknown")).toBe("tenant")
    expect(normalizePortalRole(null)).toBe("tenant")
  })

  it("maps every fixture role to an accessible cue", () => {
    for (const role of roleSwitchFixture) {
      const cue = getRoleCue(role)
      expect(cue.role).toBe(role)
      expect(cue.roleLabel.length).toBeGreaterThan(0)
      expect(cue.contextCopy.length).toBeGreaterThan(20)
      expect(cue.accentClassName).toContain("role-cue--")
    }
  })

  it("cycles role fixtures for role-switch test paths", () => {
    expect(pickRoleFixture(0)).toBe("tenant")
    expect(pickRoleFixture(1)).toBe("roommate")
    expect(pickRoleFixture(5)).toBe("roommate")
  })
})
