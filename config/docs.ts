import { MainNavItem, SidebarNavItem } from "types/nav"

import { docsSidebarNav, roleNavigation } from "@/config/navigation"

interface DocsConfig {
  mainNav: MainNavItem[]
  sidebarNav: SidebarNavItem[]
}

export const docsConfig: DocsConfig = {
  mainNav: roleNavigation.tenant.primaryNav,
  sidebarNav: docsSidebarNav,
}
