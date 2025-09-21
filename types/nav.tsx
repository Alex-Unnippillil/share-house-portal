import { Icons } from "@/components/icons"


export interface NavItem {
  title: string
  href?: string
  disabled?: boolean
  external?: boolean
  icon?: keyof typeof Icons
  label?: string
  roles?: string[]
  requiresAuth?: boolean
  guestOnly?: boolean
  tenantsOnly?: boolean
}

export interface NavItemWithChildren extends NavItem {
  items: NavItemWithChildren[]
}

export interface MainNavItem extends NavItem {}

export interface SidebarNavItem extends NavItemWithChildren {}