import Table, { TableHeader } from "@/components/ui/table"

import { readMembers } from "../actions"
import ListOfMembers from "./ListOfMembers"

export default async function MemberTable() {
  const members = await readMembers()

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
      <ListOfMembers members={members} />
    </Table>
  )
}
