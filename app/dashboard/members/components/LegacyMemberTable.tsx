import { MembersTableClient } from "./MembersTableClient"

import { DashboardMember } from "../data"

const LEGACY_MEMBERS: DashboardMember[] = [
  {
    name: "Admin Member",
    role: "admin",
    createdAt: new Date().toDateString(),
    status: "active",
  },
  {
    name: "Non Admin User",
    role: "user",
    createdAt: new Date().toDateString(),
    status: "active",
  },
  {
    name: "Administrator",
    role: "admin",
    createdAt: new Date().toDateString(),
    status: "resigned",
  },
  {
    name: "Satoshi",
    role: "user",
    createdAt: new Date().toDateString(),
    status: "active",
  },
]

export function LegacyMemberTable() {
  return <MembersTableClient data={LEGACY_MEMBERS} tableId="legacy-members" />
}
