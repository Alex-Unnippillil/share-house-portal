import type { BuildingRole } from "@/types/auth";

export type RouteGuard = {
  name: string;
  pattern: RegExp;
  methods?: string[];
  allowedRoles: BuildingRole[];
  requireAuth?: boolean;
  requireMembership?: boolean;
  buildingMatchIndex?: number;
};

export type MembershipSummary = {
  building_id: string;
  role: BuildingRole;
  is_primary: boolean;
};

export const ROUTE_GUARDS: RouteGuard[] = [
  {
    name: "dashboard-members",
    pattern: /^\/dashboard\/members(?:\/.*)?$/,
    allowedRoles: ["property_manager", "admin"],
    requireAuth: true,
    requireMembership: true,
  },
  {
    name: "dashboard",
    pattern: /^\/dashboard(?:\/.*)?$/,
    allowedRoles: ["tenant", "roommate", "property_manager", "admin"],
    requireAuth: true,
    requireMembership: true,
  },
  {
    name: "api-buildings-list",
    pattern: /^\/api\/buildings$/,
    methods: ["GET"],
    allowedRoles: ["admin", "property_manager"],
    requireAuth: true,
    requireMembership: true,
  },
  {
    name: "api-buildings-detail",
    pattern: /^\/api\/buildings\/([^/]+)$/,
    methods: ["GET"],
    allowedRoles: ["admin", "property_manager", "roommate"],
    requireAuth: true,
    requireMembership: true,
    buildingMatchIndex: 1,
  },
  {
    name: "api-buildings-residents-create",
    pattern: /^\/api\/buildings\/([^/]+)\/residents$/,
    methods: ["POST"],
    allowedRoles: ["admin", "property_manager"],
    requireAuth: true,
    requireMembership: true,
    buildingMatchIndex: 1,
  },
  {
    name: "api-buildings-resident-detail",
    pattern: /^\/api\/buildings\/([^/]+)\/residents\/([^/]+)$/,
    methods: ["GET"],
    allowedRoles: ["admin", "property_manager"],
    requireAuth: true,
    requireMembership: true,
    buildingMatchIndex: 1,
  },
  {
    name: "api-buildings-maintenance-create",
    pattern: /^\/api\/buildings\/([^/]+)\/maintenance$/,
    methods: ["POST"],
    allowedRoles: ["tenant", "roommate", "property_manager"],
    requireAuth: true,
    requireMembership: true,
    buildingMatchIndex: 1,
  },
  {
    name: "api-buildings-maintenance-update",
    pattern: /^\/api\/buildings\/([^/]+)\/maintenance\/([^/]+)$/,
    methods: ["PATCH"],
    allowedRoles: ["roommate", "property_manager"],
    requireAuth: true,
    requireMembership: true,
    buildingMatchIndex: 1,
  },
  {
    name: "api-buildings-reports",
    pattern: /^\/api\/buildings\/([^/]+)\/reports\/monthly$/,
    methods: ["GET"],
    allowedRoles: ["admin", "property_manager"],
    requireAuth: true,
    requireMembership: true,
    buildingMatchIndex: 1,
  },
  {
    name: "api-send",
    pattern: /^\/api\/send$/,
    methods: ["POST"],
    allowedRoles: ["admin", "property_manager", "roommate"],
    requireAuth: true,
    requireMembership: true,
  },
];

export function matchRoute(
  pathname: string,
  method: string
): { guard: RouteGuard; match: RegExpMatchArray } | null {
  for (const guard of ROUTE_GUARDS) {
    if (guard.methods && !guard.methods.includes(method)) {
      continue;
    }

    const match = guard.pattern.exec(pathname);
    if (match) {
      return { guard, match };
    }
  }

  return null;
}

export function selectActiveMembership(
  memberships: MembershipSummary[],
  requestedBuildingId?: string | null
): MembershipSummary | null {
  if (memberships.length === 0) {
    return null;
  }

  if (requestedBuildingId) {
    const match = memberships.find(
      (membership) => membership.building_id === requestedBuildingId
    );
    if (match) {
      return match;
    }
  }

  return (
    memberships.find((membership) => membership.is_primary) ?? memberships[0]
  );
}

export function hasRequiredRole(
  guard: RouteGuard,
  memberships: MembershipSummary[],
  buildingId: string | null
): boolean {
  if (guard.allowedRoles.length === 0) {
    return true;
  }

  const scopedMemberships = buildingId
    ? memberships.filter((membership) => membership.building_id === buildingId)
    : memberships;

  if (scopedMemberships.length === 0) {
    return false;
  }

  return scopedMemberships.some((membership) =>
    guard.allowedRoles.includes(membership.role)
  );
}
