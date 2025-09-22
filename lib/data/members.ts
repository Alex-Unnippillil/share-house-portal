export type MemberRole = "admin" | "user" | "roommate" | "property_manager"
export type MemberStatus = "active" | "resigned" | "invited"

export interface MemberRecord {
  id: string
  name: string
  role: MemberRole
  joinedAt: string
  status: MemberStatus
}

const MEMBER_DIRECTORY: MemberRecord[] = [
  {
    id: "member_admin_001",
    name: "Admin Member",
    role: "admin",
    joinedAt: "2023-01-05T00:00:00.000Z",
    status: "active",
  },
  {
    id: "member_user_002",
    name: "Non Admin User",
    role: "user",
    joinedAt: "2023-03-17T00:00:00.000Z",
    status: "active",
  },
  {
    id: "member_admin_003",
    name: "Administrator",
    role: "admin",
    joinedAt: "2022-11-23T00:00:00.000Z",
    status: "resigned",
  },
  {
    id: "member_user_004",
    name: "Satoshi",
    role: "user",
    joinedAt: "2024-04-12T00:00:00.000Z",
    status: "active",
  },
  {
    id: "member_manager_005",
    name: "Property Manager",
    role: "property_manager",
    joinedAt: "2024-01-30T00:00:00.000Z",
    status: "active",
  },
  {
    id: "member_roommate_006",
    name: "Roommate Rivera",
    role: "roommate",
    joinedAt: "2023-08-09T00:00:00.000Z",
    status: "invited",
  },
]

function matchesQuery(member: MemberRecord, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }

  return (
    member.name.toLowerCase().includes(normalized) ||
    member.role.toLowerCase().includes(normalized) ||
    member.status.toLowerCase().includes(normalized)
  )
}

export async function searchMembers(query?: string) {
  if (!query) {
    return MEMBER_DIRECTORY.map((member) => ({ ...member }))
  }

  const filtered = MEMBER_DIRECTORY.filter((member) => matchesQuery(member, query))
  return filtered.map((member) => ({ ...member }))
}
