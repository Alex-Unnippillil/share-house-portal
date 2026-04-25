import "server-only"

export type MemberRole = "tenant" | "roommate" | "property_manager" | "admin"
export type MemberStatus = "active" | "resigned"

export type DashboardMember = {
  id: string
  name: string
  role: MemberRole
  createdAt: string
  status: MemberStatus
}
