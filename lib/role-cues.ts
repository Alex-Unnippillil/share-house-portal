import type { PortalRole } from "@/config/navigation"
import { migrateLegacyRole } from "@/lib/roles"

const ROLE_LABELS: Record<PortalRole, string> = {
  tenant: "Tenant",
  roommate: "Roommate",
  property_manager: "Property manager",
  admin: "Admin",
}

const ROLE_CONTEXT_COPY: Record<PortalRole, string> = {
  tenant: "Track rent, bookings, and shared household responsibilities.",
  roommate: "Coordinate shared tasks and stay aligned on household updates.",
  property_manager: "Monitor resident operations, escalations, and approvals.",
  admin: "Oversee compliance, operations, and platform-level health signals.",
}

export type RoleCue = {
  role: PortalRole
  roleLabel: string
  contextCopy: string
  accentClassName: string
}

export function normalizePortalRole(
  role: string | null | undefined
): PortalRole {
  return migrateLegacyRole(role) ?? "tenant"
}

export function getRoleCue(role: string | null | undefined): RoleCue {
  const normalizedRole = normalizePortalRole(role)

  return {
    role: normalizedRole,
    roleLabel: ROLE_LABELS[normalizedRole],
    contextCopy: ROLE_CONTEXT_COPY[normalizedRole],
    accentClassName: `role-cue--${normalizedRole}`,
  }
}
