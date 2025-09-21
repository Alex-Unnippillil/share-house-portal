import type { BuildingMembership, PortalRole } from "@/types/rbac"

export interface RouteRoleEntry {
  pattern: RegExp
  roles: PortalRole[]
  methods?: string[]
  buildingRequired: boolean
  description: string
}

// Route protections are derived from docs/security/authorization-model.md
export const ROUTE_ROLE_MATRIX: RouteRoleEntry[] = [
  {
    pattern: /^\/dashboard\/members(?:\/.*)?$/,
    roles: ["property_manager", "admin"],
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    buildingRequired: true,
    description: "Dashboard member administration",
  },
  {
    pattern: /^\/dashboard(?:\/.*)?$/,
    roles: ["tenant", "roommate", "property_manager", "admin"],
    buildingRequired: true,
    description: "Authenticated dashboard pages",
  },
  {
    pattern: /^\/api\/buildings$/,
    roles: ["property_manager", "admin"],
    methods: ["GET"],
    buildingRequired: false,
    description: "List buildings visible to a manager or admin",
  },
  {
    pattern: /^\/api\/buildings\/[^/]+$/,
    roles: ["roommate", "property_manager", "admin"],
    methods: ["GET"],
    buildingRequired: true,
    description: "Retrieve configuration for a building",
  },
  {
    pattern: /^\/api\/buildings\/[^/]+\/residents$/,
    roles: ["property_manager", "admin"],
    methods: ["POST"],
    buildingRequired: true,
    description: "Invite or import residents",
  },
  {
    pattern: /^\/api\/buildings\/[^/]+\/residents\/[^/]+$/,
    roles: ["property_manager", "admin"],
    methods: ["GET"],
    buildingRequired: true,
    description: "View resident profile for a building",
  },
  {
    pattern: /^\/api\/buildings\/[^/]+\/maintenance$/,
    roles: ["tenant", "roommate", "property_manager", "admin"],
    methods: ["POST"],
    buildingRequired: true,
    description: "Submit maintenance ticket",
  },
  {
    pattern: /^\/api\/buildings\/[^/]+\/maintenance\/[^/]+$/,
    roles: ["roommate", "property_manager", "admin"],
    methods: ["PATCH", "PUT"],
    buildingRequired: true,
    description: "Update maintenance ticket",
  },
  {
    pattern: /^\/api\/buildings\/[^/]+\/reports\/monthly$/,
    roles: ["property_manager", "admin"],
    methods: ["GET"],
    buildingRequired: true,
    description: "Download operational reports",
  },
  {
    pattern: /^\/api\/send$/,
    roles: ["roommate", "property_manager", "admin"],
    methods: ["POST"],
    buildingRequired: true,
    description: "Trigger transactional email",
  },
]

export function matchRouteRole(
  pathname: string,
  method: string
): RouteRoleEntry | null {
  const normalizedMethod = method.toUpperCase()
  for (const entry of ROUTE_ROLE_MATRIX) {
    if (!entry.pattern.test(pathname)) {
      continue
    }

    if (entry.methods && entry.methods.length > 0) {
      if (entry.methods.includes(normalizedMethod)) {
        return entry
      }
      continue
    }

    return entry
  }

  return null
}

export function isRoleAuthorized(
  role: PortalRole | null | undefined,
  allowedRoles: PortalRole[]
): boolean {
  if (!allowedRoles.length) {
    return true
  }

  if (!role) {
    return false
  }

  return allowedRoles.includes(role)
}

export function filterNavigationByRole<
  T extends { roles?: PortalRole[]; items?: T[] }
>(items: T[], role: PortalRole | null | undefined): T[] {
  return items
    .map((item) => {
      if (Array.isArray(item.items)) {
        const filteredChildren = filterNavigationByRole(item.items, role)
        return {
          ...item,
          items: filteredChildren,
        }
      }

      return item
    })
    .filter((item) => {
      const allowed = !item.roles?.length || (role && item.roles.includes(role))

      if (!allowed) {
        return false
      }

      if (Array.isArray(item.items)) {
        return item.items.length > 0
      }

      return true
    })
}

export function extractBuildingIdFromPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean)
  const buildingSegmentIndex = segments.findIndex(
    (segment) => segment === "buildings"
  )

  if (buildingSegmentIndex >= 0) {
    const candidate = segments[buildingSegmentIndex + 1]
    if (candidate) {
      try {
        return decodeURIComponent(candidate)
      } catch (error) {
        return candidate
      }
    }
  }

  return null
}

export function resolveActiveMembership({
  memberships,
  requestedBuildingId,
  fallbackBuildingId,
}: {
  memberships: BuildingMembership[]
  requestedBuildingId?: string | null
  fallbackBuildingId?: string | null
}): BuildingMembership | null {
  if (!memberships.length) {
    return null
  }

  if (requestedBuildingId) {
    const match = memberships.find(
      (membership) => membership.building_id === requestedBuildingId
    )

    if (match) {
      return match
    }
  }

  if (fallbackBuildingId) {
    const match = memberships.find(
      (membership) => membership.building_id === fallbackBuildingId
    )

    if (match) {
      return match
    }
  }

  return memberships[0]
}
