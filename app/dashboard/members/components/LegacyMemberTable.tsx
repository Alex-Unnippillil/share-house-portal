import Table, { TableHeader } from "@/components/ui/table"

import { DashboardMember } from "../data"
import ListOfMembers from "./ListOfMembers"

const LEGACY_MEMBERS: DashboardMember[] = [
  {
    name: "Admin Member",
    role: "admin",
    createdAt: new Date().toDateString(),
    status: "active",
  },
  {
    name: "Tenant Member",
    role: "tenant",
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
