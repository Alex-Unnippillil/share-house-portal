import { Icons } from "@/components/icons"
import type { BuildingRole } from "@/types/auth"

export interface NavItem {
  title: string
  href?: string
  disabled?: boolean
  external?: boolean
  icon?: keyof typeof Icons
  label?: string
  requiresAuth?: boolean
  requireActiveMembership?: boolean
  allowedRoles?: BuildingRole[]
}

export interface NavItemWithChildren extends NavItem {
  items: NavItemWithChildren[]
}

export interface MainNavItem extends NavItem {}

export interface SidebarNavItem extends NavItemWithChildren {}