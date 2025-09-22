import React from "react"
import Table from "@/components/ui/Table"
import ListOfMembers, { defaultMembers } from "./ListOfMembers"
import type { DashboardMemberRecord } from "@/types/perf"

interface MemberTableProps {
  members?: DashboardMemberRecord[]
}

export default function MemberTable({ members = defaultMembers }: MemberTableProps) {
  const tableHeader = ["Name", "Role", "Joined", "Status"]

  return (
    <Table headers={tableHeader}>
      <ListOfMembers members={members} />
    </Table>
  )
}
