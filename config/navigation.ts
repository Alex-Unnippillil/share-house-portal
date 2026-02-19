import type { MainNavItem, SidebarNavItem } from "@/types/nav"

export type PortalRole = "tenant" | "roommate" | "property_manager" | "admin"
export type NavTree = "public" | "tenant" | "property_manager" | "admin"

type NavigationItem = MainNavItem & {
  authOnly?: boolean
  roles?: PortalRole[]
  disabled?: boolean
}

type RoleNavigationConfig = {
  roleLabel: string
  primaryNav: MainNavItem[]
}

export const appWorkspaceNav: MainNavItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Payments", href: "/payments" },
  { title: "Bookings", href: "/bookings" },
  { title: "Documents", href: "/documents" },
  { title: "Maintenance", href: "/maintenance" },
  { title: "Message board", href: "/messaging" },
  { title: "Visitors", href: "/visitors" },
]

export const publicNav: MainNavItem[] = [
  { title: "Home", href: "/" },
  { title: "Contact", href: "/contact" },
]

export const navigationConfig: Record<NavTree, NavigationItem[]> = {
  public: publicNav,
  tenant: [...appWorkspaceNav, { title: "Supplies", href: "/supplies", disabled: true }],
  property_manager: [
    ...appWorkspaceNav,
    { title: "Members", href: "/dashboard/members", roles: ["property_manager", "admin"] },
  ],
  admin: [
    ...appWorkspaceNav,
    { title: "Members", href: "/dashboard/members", roles: ["property_manager", "admin"] },
  ],
}

export const roleNavigation: Record<PortalRole, RoleNavigationConfig> = {
  tenant: {
    roleLabel: "Tenant",
    primaryNav: appWorkspaceNav,
  },
  roommate: {
    roleLabel: "Roommate",
    primaryNav: appWorkspaceNav,
  },
  property_manager: {
    roleLabel: "Property manager",
    primaryNav: appWorkspaceNav,
  },
  admin: {
    roleLabel: "Admin",
    primaryNav: appWorkspaceNav,
  },
}

export function resolveNavTreeForRole(role: PortalRole | "public" | null | undefined): NavTree {
  if (!role || role === "public") {
    return "public"
  }

  if (role === "roommate") {
    return "tenant"
  }

  return role
}

export function getNavigationItems(
  tree: NavTree,
  options: { role: PortalRole | "public"; includeDisabled?: boolean }
): NavigationItem[] {
  if (tree === "public" && options.role !== "public") {
    return navigationConfig[resolveNavTreeForRole(options.role)]
  }

  return navigationConfig[tree].filter((item) => {
    if (!options.includeDisabled && item.disabled) {
      return false
    }

    if (item.roles && options.role !== "public") {
      return item.roles.includes(options.role)
    }

    return !item.roles
  })
}

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
