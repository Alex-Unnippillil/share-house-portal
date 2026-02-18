import Table from "@/components/ui/Table"

import { getDashboardMembers } from "../data"
import ListOfMembers from "./ListOfMembers"

export default async function MemberTable() {
  const members = await getDashboardMembers()
  const tableHeader = ["Name", "Role", "Joined", "Status"]

  return (
    <Table headers={tableHeader}>
      <ListOfMembers members={members} />
    </Table>
  )
}
