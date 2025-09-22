import Table from "@/components/ui/Table"

import { DashboardMember } from "../data"
import ListOfMembers from "./ListOfMembers"

const LEGACY_MEMBERS: DashboardMember[] = [
        {
                name: "Avery Chen",
                role: "tenant",
                persona: "resident",
                createdAt: new Date().toDateString(),
                status: "active",
        },
        {
                name: "Jordan Blake",
                role: "roommate",
                persona: "resident",
                createdAt: new Date().toDateString(),
                status: "resigned",
        },
        {
                name: "Morgan Ellis",
                role: "property_manager",
                persona: "management",
                createdAt: new Date().toDateString(),
                status: "active",
        },
        {
                name: "Sonia Patel",
                role: "landlord",
                persona: "management",
                createdAt: new Date().toDateString(),
                status: "active",
        },
]

export function LegacyMemberTable() {
        const tableHeader = ["Name & Profile", "Role", "Joined", "Status", "Actions"]
        return (
                <Table headers={tableHeader}>
                        <ListOfMembers members={LEGACY_MEMBERS} />
                </Table>
        )
}
