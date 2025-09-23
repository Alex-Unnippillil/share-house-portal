import Table, { TableSelectionProvider } from "@/components/ui/Table"
import BulkActionsBar from "@/components/tables/BulkActionsBar"

import { getDashboardMembers } from "../data"
import ListOfMembers from "./ListOfMembers"

export default async function MemberTable() {
        const members = await getDashboardMembers()
        const tableHeader = ["Name", "Role", "Joined", "Status", "Actions"]

        return (
                <TableSelectionProvider>
                        <div className="space-y-4">
                                <BulkActionsBar entityType="members" />
                                <Table headers={tableHeader} selectable>
                                        <ListOfMembers members={members} />
                                </Table>
                        </div>
                </TableSelectionProvider>
        )
}
