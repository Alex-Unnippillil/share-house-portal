import type { MainNavItem, SidebarNavItem } from "@/types/nav"

export type PortalRole = "tenant" | "roommate" | "property_manager" | "admin"

type RoleNavigationConfig = {
  roleLabel: string
  primaryNav: MainNavItem[]
}

const tenantPrimaryNav: MainNavItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Payments", href: "/payments" },
  { title: "Bookings", href: "/bookings" },
  { title: "Documents", href: "/documents" },
  { title: "Maintenance", href: "/maintenance" },
  { title: "Messaging", href: "/messaging" },
  { title: "Visitors", href: "/visitors" },
]

const managerPrimaryNav: MainNavItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Payments", href: "/payments" },
  { title: "Bookings", href: "/bookings" },
  { title: "Documents", href: "/documents" },
  { title: "Maintenance", href: "/maintenance" },
  { title: "Messaging", href: "/messaging" },
  { title: "Visitors", href: "/visitors" },
]

const adminPrimaryNav: MainNavItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Payments", href: "/payments" },
  { title: "Bookings", href: "/bookings" },
  { title: "Documents", href: "/documents" },
  { title: "Maintenance", href: "/maintenance" },
  { title: "Messaging", href: "/messaging" },
  { title: "Visitors", href: "/visitors" },
]

export const roleNavigation: Record<PortalRole, RoleNavigationConfig> = {
  tenant: {
    roleLabel: "Tenant",
    primaryNav: tenantPrimaryNav,
  },
  roommate: {
    roleLabel: "Roommate",
    primaryNav: tenantPrimaryNav,
  },
  property_manager: {
    roleLabel: "Property manager",
    primaryNav: managerPrimaryNav,
  },
  admin: {
    roleLabel: "Admin",
    primaryNav: adminPrimaryNav,
  },
}

export const publicNav: MainNavItem[] = [
  { title: "Home", href: "/" },
  { title: "Contact", href: "/contact" },
]

export const docsSidebarNav: SidebarNavItem[] = [
  {
    title: "Tools",
    items: [
      {
        title: "Sign Out",
        href: "/signout",
        items: [],
      },
    ],
  },
]

export function getRoleNavigation(role: PortalRole | null | undefined): RoleNavigationConfig {
  if (!role) {
    return {
      roleLabel: "Guest",
      primaryNav: publicNav,
    }
  }

  return roleNavigation[role]
}
