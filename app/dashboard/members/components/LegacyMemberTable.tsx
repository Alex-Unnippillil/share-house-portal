import Table from "@/components/ui/Table"

import { DashboardMember } from "../data"
import ListOfMembers from "./ListOfMembers"

const LEGACY_MEMBERS: DashboardMember[] = [
        {
                id: "legacy-admin-1",
                name: "Admin Member",
                role: "admin",
                createdAt: new Date().toISOString(),
                status: "active",
        },
        {
                id: "legacy-user-1",
                name: "Non Admin User",
                role: "user",
                createdAt: new Date().toISOString(),
                status: "active",
        },
        {
                id: "legacy-admin-2",
                name: "Administrator",
                role: "admin",
                createdAt: new Date().toISOString(),
                status: "resigned",
        },
        {
                id: "legacy-user-2",
                name: "Satoshi",
                role: "user",
                createdAt: new Date().toISOString(),
                status: "active",
        },
]

export function LegacyMemberTable() {
        const tableHeader = ["Name", "Role", "Joined", "Status"]
        return (
                <Table headers={tableHeader}>
                        <ListOfMembers members={LEGACY_MEMBERS} />
                </Table>
        )
}
