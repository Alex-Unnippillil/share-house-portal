import { MembersTableClient } from "./MembersTableClient"

import { getDashboardMembers } from "../data"

export default async function MemberTable() {
  const members = await getDashboardMembers()

  return <MembersTableClient data={members} tableId="dashboard-members" />
}
