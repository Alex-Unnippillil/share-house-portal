import Table from "@/components/ui/Table"

import { DashboardMember } from "../data"
import ListOfMembers from "./ListOfMembers"

const LEGACY_MEMBERS: DashboardMember[] = [
        {
                id: "legacy-1",
                name: "Admin Member",
                role: "admin",
                createdAt: new Date().toDateString(),
                status: "active",
        },
        {
                id: "legacy-2",
                name: "Non Admin User",
                role: "user",
                createdAt: new Date().toDateString(),
                status: "active",
        },
        {
                id: "legacy-3",
                name: "Administrator",
                role: "admin",
                createdAt: new Date().toDateString(),
                status: "resigned",
        },
        {
                id: "legacy-4",
                name: "Satoshi",
                role: "user",
                createdAt: new Date().toDateString(),
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
