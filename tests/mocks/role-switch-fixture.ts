import type { PortalRole } from "@/config/navigation"

export const roleSwitchFixture: PortalRole[] = [
  "tenant",
  "roommate",
  "property_manager",
  "admin",
]

export function pickRoleFixture(index: number): PortalRole {
  return roleSwitchFixture[index % roleSwitchFixture.length]
}
