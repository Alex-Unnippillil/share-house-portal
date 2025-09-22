export type DashboardNavIcon =
  | "members"
  | "payments"
  | "documents"
  | "messaging"
  | "chores"
  | "supplies"

export interface DashboardNavItem {
  href: string
  text: string
  icon: DashboardNavIcon
}

export const landlordRoles = new Set(["property_manager", "admin", "landlord"])

export function isLandlordRole(role: string | null | undefined): boolean {
  if (!role) {
    return false
  }

  return landlordRoles.has(role)
}

const landlordNavigation: DashboardNavItem[] = [
  { href: "/dashboard/members", text: "Members", icon: "members" },
  { href: "/payments", text: "Payments", icon: "payments" },
  { href: "/documents", text: "Documents", icon: "documents" },
  { href: "/messaging", text: "Message Board", icon: "messaging" },
]

const residentNavigation: DashboardNavItem[] = [
  { href: "/payments", text: "Payments", icon: "payments" },
  { href: "/documents", text: "My Lease", icon: "documents" },
  { href: "/messaging", text: "Message Board", icon: "messaging" },
  { href: "/chores", text: "Chores", icon: "chores" },
  { href: "/supplies", text: "Supplies", icon: "supplies" },
]

export function getDashboardNavLinks(role: string | null | undefined): DashboardNavItem[] {
  return isLandlordRole(role) ? landlordNavigation : residentNavigation
}
