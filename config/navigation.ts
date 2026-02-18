import type { MainNavItem } from "types/nav"

import type { AppRole } from "@/lib/auth-rbac"

export type NavTree = "public" | "tenant" | "property_manager" | "admin"
export type NavContextRole = AppRole | "public" | null | undefined

export type RouteGuard = {
  requireAuth?: boolean
  allowedRoles?: ReadonlyArray<AppRole>
}

export type NavigationItem = {
  id: string
  title: string
  href: string
  disabled?: boolean
  hidden?: boolean
  guard?: RouteGuard
}

export const navigationConfig: Record<NavTree, NavigationItem[]> = {
  public: [
    { id: "home", title: "Home", href: "/" },
    {
      id: "dashboard",
      title: "Dashboard",
      href: "/dashboard",
      guard: { requireAuth: true },
    },
    {
      id: "payments",
      title: "Payments",
      href: "/payments",
      guard: { requireAuth: true },
    },
    {
      id: "documents",
      title: "Documents",
      href: "/documents",
      guard: { requireAuth: true },
    },
    {
      id: "message-board",
      title: "Message board",
      href: "/messaging",
      guard: { requireAuth: true },
    },
    {
      id: "visitors",
      title: "Visitors",
      href: "/visitors",
      guard: { requireAuth: true },
    },
    {
      id: "maintenance",
      title: "Maintenance",
      href: "/maintenance",
      guard: { requireAuth: true },
    },
    {
      id: "account",
      title: "Account",
      href: "/account",
      guard: { requireAuth: true },
    },
    { id: "contact", title: "Contact", href: "/contact" },
  ],
  tenant: [
    { id: "dashboard", title: "Dashboard", href: "/dashboard" },
    { id: "payments", title: "Payments", href: "/payments" },
    { id: "bookings", title: "Amenity bookings", href: "/bookings" },
    { id: "documents", title: "Documents", href: "/documents" },
    { id: "message-board", title: "Message board", href: "/messaging" },
    { id: "chores", title: "Chores", href: "/chores" },
    { id: "supplies", title: "Supplies", href: "/supplies", disabled: true },
  ],
  property_manager: [
    {
      id: "operations",
      title: "Operations",
      href: "/dashboard/operations",
      guard: { allowedRoles: ["property_manager", "admin"] },
    },
    {
      id: "members",
      title: "Members",
      href: "/dashboard/members",
      guard: { allowedRoles: ["property_manager", "admin"] },
    },
    { id: "payments", title: "Payments", href: "/payments" },
    { id: "documents", title: "Documents", href: "/documents" },
    { id: "message-board", title: "Message board", href: "/messaging" },
    { id: "maintenance", title: "Maintenance", href: "/maintenance" },
    { id: "visitors", title: "Visitors", href: "/visitors" },
  ],
  admin: [
    {
      id: "operations",
      title: "Operations",
      href: "/dashboard/operations",
      guard: { allowedRoles: ["property_manager", "admin"] },
    },
    {
      id: "members",
      title: "Members",
      href: "/dashboard/members",
      guard: { allowedRoles: ["property_manager", "admin"] },
    },
    { id: "dashboard", title: "Dashboard", href: "/dashboard" },
    { id: "payments", title: "Payments", href: "/payments" },
    { id: "documents", title: "Documents", href: "/documents" },
    { id: "message-board", title: "Message board", href: "/messaging" },
    { id: "maintenance", title: "Maintenance", href: "/maintenance" },
    { id: "visitors", title: "Visitors", href: "/visitors" },
  ],
}

function canAccessByGuard(item: NavigationItem, role: NavContextRole): boolean {
  const { guard } = item

  if (!guard) {
    return true
  }

  const isAuthenticated = Boolean(role && role !== "public")

  if (guard.requireAuth && !isAuthenticated) {
    return false
  }

  if (!guard.allowedRoles?.length) {
    return true
  }

  if (!role || role === "public") {
    return false
  }

  return guard.allowedRoles.includes(role)
}

export function resolveNavTreeForRole(role: NavContextRole): NavTree {
  if (role === "admin") {
    return "admin"
  }

  if (role === "property_manager") {
    return "property_manager"
  }

  if (role === "tenant" || role === "roommate") {
    return "tenant"
  }

  return "public"
}

export function getNavigationItems(
  tree: NavTree,
  options: { role?: NavContextRole; includeHidden?: boolean; includeDisabled?: boolean } = {}
): NavigationItem[] {
  const { role, includeHidden = false, includeDisabled = true } = options

  return navigationConfig[tree].filter((item) => {
    if (!includeHidden && item.hidden) {
      return false
    }

    if (!includeDisabled && item.disabled) {
      return false
    }

    return canAccessByGuard(item, role)
  })
}

export function getMainNavigationItems(role: NavContextRole): MainNavItem[] {
  const tree = resolveNavTreeForRole(role)

  return getNavigationItems(tree, { role, includeDisabled: false }).map((item) => ({
    title: item.title,
    href: item.href,
    disabled: item.disabled,
  }))
}
