import Table from "@/components/ui/table"

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
