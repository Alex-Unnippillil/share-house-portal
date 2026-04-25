import type { MainNavItem, SidebarNavItem } from "@/types/nav"
import type { AppRole as PortalRole } from "@/lib/roles"

export type { PortalRole }
export type NavTree = "public" | "tenant" | "property_manager" | "admin"
export type NavigationDomain = "core" | "operations" | "account"

export type RoleNavItem = MainNavItem & {
  domain?: NavigationDomain
  subtitle?: string
  badge?: string
}

export type RoleNavSection = {
  id: NavigationDomain
  title: string
  items: RoleNavItem[]
}

export type PaletteQuickAction = {
  id: "maintenance" | "document" | "visitor" | "rent"
  title: string
  subtitle: string
  href: string
}

type NavigationItem = RoleNavItem & {
  authOnly?: boolean
  roles?: PortalRole[]
  disabled?: boolean
}

type RoleNavigationConfig = {
  roleLabel: string
  primaryNav: RoleNavItem[]
  sections: RoleNavSection[]
}

export const appWorkspaceNav: RoleNavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: "dashboard", domain: "core", subtitle: "Household overview" },
  { title: "Payments", href: "/payments", icon: "creditCard", domain: "core", subtitle: "Rent, autopay & receipts", badge: "Due" },
  { title: "Bookings", href: "/bookings", icon: "calendar", domain: "core", subtitle: "Amenities & shared spaces" },
  { title: "Documents", href: "/documents", icon: "fileText", domain: "operations", subtitle: "Leases & files" },
  { title: "Maintenance", href: "/maintenance", icon: "wrench", domain: "operations", subtitle: "Issues & follow-up", badge: "Priority" },
  { title: "Message board", href: "/messaging", icon: "messages", domain: "operations", subtitle: "Roommate updates" },
  { title: "Visitors", href: "/visitors", icon: "visitors", domain: "account", subtitle: "Overnight guest log" },
]

export const publicNav: MainNavItem[] = [
  { title: "Home", href: "/", icon: "home" },
  { title: "Contact", href: "/contact", icon: "phone" },
]

export const navigationConfig: Record<NavTree, NavigationItem[]> = {
  public: publicNav,
  tenant: [...appWorkspaceNav, { title: "Supplies", href: "/supplies", disabled: true, domain: "operations" }],
  property_manager: [
    ...appWorkspaceNav,
    {
      title: "Members",
      href: "/dashboard/members",
      icon: "users",
      roles: ["property_manager", "admin"],
      domain: "account",
      subtitle: "Roster & access",
      badge: "Admin",
    },
  ],
  admin: [
    ...appWorkspaceNav,
    {
      title: "Members",
      href: "/dashboard/members",
      icon: "users",
      roles: ["property_manager", "admin"],
      domain: "account",
      subtitle: "Roster & access",
      badge: "Admin",
    },
  ],
}

function buildRoleSections(items: RoleNavItem[]): RoleNavSection[] {
  const sections: RoleNavSection[] = [
    { id: "core", title: "Core", items: [] },
    { id: "operations", title: "Operations", items: [] },
    { id: "account", title: "Account", items: [] },
  ]

  for (const item of items) {
    const domain = item.domain ?? "core"
    const section = sections.find((candidate) => candidate.id === domain)

    if (section) {
      section.items.push(item)
    }
  }

  return sections.filter((section) => section.items.length > 0)
}

export const roleNavigation: Record<PortalRole, RoleNavigationConfig> = {
  tenant: {
    roleLabel: "Tenant",
    primaryNav: appWorkspaceNav,
    sections: buildRoleSections(appWorkspaceNav),
  },
  roommate: {
    roleLabel: "Roommate",
    primaryNav: appWorkspaceNav,
    sections: buildRoleSections(appWorkspaceNav),
  },
  property_manager: {
    roleLabel: "Property manager",
    primaryNav: navigationConfig.property_manager,
    sections: buildRoleSections(navigationConfig.property_manager),
  },
  admin: {
    roleLabel: "Admin",
    primaryNav: navigationConfig.admin,
    sections: buildRoleSections(navigationConfig.admin),
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

export const paletteQuickActions: PaletteQuickAction[] = [
  {
    id: "maintenance",
    title: "Create maintenance request",
    subtitle: "Report repairs, hazards, or shared-space issues",
    href: "/maintenance",
  },
  {
    id: "document",
    title: "Upload document",
    subtitle: "Add lease files and compliance paperwork",
    href: "/documents",
  },
  {
    id: "visitor",
    title: "Log visitor",
    subtitle: "Register overnight guests and notify roommates",
    href: "/visitors",
  },
  {
    id: "rent",
    title: "Pay rent",
    subtitle: "Open rent payment tools and catch-up balance",
    href: "/payments",
  },
]

export function getCommandPaletteNavigation(role: PortalRole | null | undefined) {
  const roleConfig = getRoleNavigation(role)

  return {
    roleLabel: roleConfig.roleLabel,
    routes: roleConfig.primaryNav.filter((item) => Boolean(item.href)),
    quickActions: paletteQuickActions,
  }
}

export function getRoleNavigation(role: PortalRole | null | undefined): RoleNavigationConfig {
  if (!role) {
    return {
      roleLabel: "Guest",
      primaryNav: publicNav,
      sections: [{ id: "core", title: "Public", items: publicNav }],
    }
  }

  return roleNavigation[role]
}
