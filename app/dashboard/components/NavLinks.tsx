"use client"

import { RoleNavList } from "@/components/navigation/role-nav-list"
import type { PortalRole } from "@/config/navigation"

type NavLinksProps = {
  onNavigate?: () => void
  role?: PortalRole | null
}

export default function NavLinks({ onNavigate, role = "tenant" }: NavLinksProps) {
  return <RoleNavList role={role} onNavigate={onNavigate} />
}
