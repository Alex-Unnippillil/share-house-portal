import { describe, expect, it } from "vitest";
import {
  matchRoute,
  hasRequiredRole,
  selectActiveMembership,
  type MembershipSummary,
} from "@/lib/authz/guards";
import type { BuildingRole } from "@/types/auth";

type MembershipFactoryArgs = {
  role: BuildingRole;
  building_id?: string;
  is_primary?: boolean;
};

function createMembership({
  role,
  building_id = "building-1",
  is_primary = true,
}: MembershipFactoryArgs): MembershipSummary {
  return { building_id, role, is_primary };
}

describe("Authorization matrix alignment", () => {
  it("grants portfolio access to admins and property managers", () => {
    const match = matchRoute("/api/buildings", "GET");
    expect(match?.guard.name).toBe("api-buildings-list");
    expect(
      hasRequiredRole(
        match!.guard,
        [createMembership({ role: "property_manager" })],
        null
      )
    ).toBe(true);
    expect(
      hasRequiredRole(match!.guard, [createMembership({ role: "admin" })], null)
    ).toBe(true);
    expect(
      hasRequiredRole(match!.guard, [createMembership({ role: "tenant" })], null)
    ).toBe(false);
  });

  it("scopes building detail reads to staff roles", () => {
    const match = matchRoute("/api/buildings/bld-123", "GET");
    expect(match?.guard.name).toBe("api-buildings-detail");
    expect(
      hasRequiredRole(
        match!.guard,
        [createMembership({ role: "roommate", building_id: "bld-123" })],
        "bld-123"
      )
    ).toBe(true);
    expect(
      hasRequiredRole(
        match!.guard,
        [createMembership({ role: "tenant", building_id: "bld-123" })],
        "bld-123"
      )
    ).toBe(false);
  });

  it("limits resident imports to property managers and admins", () => {
    const match = matchRoute("/api/buildings/bld-1/residents", "POST");
    expect(match?.guard.name).toBe("api-buildings-residents-create");
    expect(
      hasRequiredRole(
        match!.guard,
        [createMembership({ role: "property_manager", building_id: "bld-1" })],
        "bld-1"
      )
    ).toBe(true);
    expect(
      hasRequiredRole(
        match!.guard,
        [createMembership({ role: "roommate", building_id: "bld-1" })],
        "bld-1"
      )
    ).toBe(false);
  });

  it("allows residents to submit maintenance but restricts updates to staff", () => {
    const submitMatch = matchRoute(
      "/api/buildings/bld-55/maintenance",
      "POST"
    );
    expect(submitMatch?.guard.name).toBe("api-buildings-maintenance-create");
    expect(
      hasRequiredRole(
        submitMatch!.guard,
        [createMembership({ role: "tenant", building_id: "bld-55" })],
        "bld-55"
      )
    ).toBe(true);

    const updateMatch = matchRoute(
      "/api/buildings/bld-55/maintenance/ticket-1",
      "PATCH"
    );
    expect(updateMatch?.guard.name).toBe("api-buildings-maintenance-update");
    expect(
      hasRequiredRole(
        updateMatch!.guard,
        [createMembership({ role: "tenant", building_id: "bld-55" })],
        "bld-55"
      )
    ).toBe(false);
    expect(
      hasRequiredRole(
        updateMatch!.guard,
        [createMembership({ role: "roommate", building_id: "bld-55" })],
        "bld-55"
      )
    ).toBe(true);
  });

  it("keeps dashboard members link gated to property management roles", () => {
    const match = matchRoute("/dashboard/members", "GET");
    expect(match?.guard.name).toBe("dashboard-members");
    expect(
      hasRequiredRole(
        match!.guard,
        [createMembership({ role: "admin" })],
        null
      )
    ).toBe(true);
    expect(
      hasRequiredRole(
        match!.guard,
        [createMembership({ role: "tenant" })],
        null
      )
    ).toBe(false);
  });
});

describe("Active membership resolution", () => {
  it("prefers requested building id when present", () => {
    const memberships = [
      createMembership({ role: "tenant", building_id: "bld-1", is_primary: false }),
      createMembership({ role: "roommate", building_id: "bld-2", is_primary: true }),
    ];

    const active = selectActiveMembership(memberships, "bld-1");
    expect(active?.building_id).toBe("bld-1");
    expect(active?.role).toBe("tenant");
  });

  it("falls back to the primary membership when no override exists", () => {
    const memberships = [
      createMembership({ role: "tenant", building_id: "bld-1", is_primary: false }),
      createMembership({ role: "roommate", building_id: "bld-2", is_primary: true }),
    ];

    const active = selectActiveMembership(memberships);
    expect(active?.building_id).toBe("bld-2");
    expect(active?.role).toBe("roommate");
  });
});
