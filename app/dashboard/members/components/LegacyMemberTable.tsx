import Table, { TableSelectionProvider } from "@/components/ui/Table"
import BulkActionsBar from "@/components/tables/BulkActionsBar"

import { DashboardMember } from "../data"
import ListOfMembers from "./ListOfMembers"

const LEGACY_MEMBERS: DashboardMember[] = [
        {
                id: "legacy-admin-1",
                name: "Admin Member",
                role: "admin",
                createdAt: new Date().toDateString(),
                status: "active",
        },
        {
                id: "legacy-user-1",
                name: "Non Admin User",
                role: "user",
                createdAt: new Date().toDateString(),
                status: "active",
        },
        {
                id: "legacy-admin-2",
                name: "Administrator",
                role: "admin",
                createdAt: new Date().toDateString(),
                status: "resigned",
        },
        {
                id: "legacy-user-2",
                name: "Satoshi",
                role: "user",
                createdAt: new Date().toDateString(),
                status: "active",
        },
]

export function LegacyMemberTable() {
        const tableHeader = ["Name", "Role", "Joined", "Status", "Actions"]
        return (
                <TableSelectionProvider>
                        <div className="space-y-4">
                                <BulkActionsBar entityType="members" />
                                <Table headers={tableHeader} selectable>
                                        <ListOfMembers members={LEGACY_MEMBERS} />
                                </Table>
                        </div>
                </TableSelectionProvider>
        )
}
