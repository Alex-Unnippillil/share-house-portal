import Table, { TableHeader } from "@/components/ui/table"

import { DashboardMember } from "../data"
import ListOfMembers from "./ListOfMembers"

const LEGACY_MEMBERS: DashboardMember[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Admin Member",
    role: "admin",
    createdAt: new Date().toDateString(),
    status: "active",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Tenant Member",
    role: "tenant",
    createdAt: new Date().toDateString(),
    status: "active",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Property Manager",
    role: "property_manager",
    createdAt: new Date().toDateString(),
    status: "resigned",
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    name: "Roommate",
    role: "roommate",
    createdAt: new Date().toDateString(),
    status: "active",
  },
]

export function LegacyMemberTable() {
  return (
    <Table stickyHeader>
      <thead>
        <tr>
          <TableHeader>Name</TableHeader>
          <TableHeader>Role</TableHeader>
          <TableHeader>Joined</TableHeader>
          <TableHeader>Status</TableHeader>
          <TableHeader className="text-right">Actions</TableHeader>
        </tr>
      </thead>
      <ListOfMembers members={LEGACY_MEMBERS} />
    </Table>
  )
}
