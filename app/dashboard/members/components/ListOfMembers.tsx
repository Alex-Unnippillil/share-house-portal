import React from "react"

import { Button } from "@/components/ui/button"
import { TrashIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"

import { DashboardMember } from "../data"
import EditMember from "./edit/EditMember"

const personaStyles: Record<DashboardMember["persona"], string> = {
        resident: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
        management: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
}

const roleLabels: Record<DashboardMember["role"], string> = {
        admin: "Admin",
        user: "User",
        tenant: "Tenant",
        roommate: "Roommate",
        property_manager: "Property Manager",
        landlord: "Landlord",
        null: "Unknown",
}

const roleStyles: Partial<Record<DashboardMember["role"], string>> = {
        admin: "border-red-300 bg-red-50 text-red-600 dark:border-red-400 dark:bg-red-950/60 dark:text-red-300",
        tenant: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-300",
        roommate: "border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-400 dark:bg-teal-950/60 dark:text-teal-300",
        property_manager: "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/60 dark:text-indigo-300",
        landlord: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400 dark:bg-amber-950/60 dark:text-amber-300",
}

export default function ListOfMembers({ members }: { members: DashboardMember[] }) {
        return (
                <div className="mx-2 rounded-sm bg-white dark:bg-inherit">
                        {members.map((member, index) => {
                                return (
                                        <div className="grid grid-cols-5 rounded-sm p-3 align-middle font-normal" key={member.name + index}>
                                                <div className="space-y-1">
                                                        <h1 className="font-medium">{member.name}</h1>
                                                        <span
                                                                className={cn(
                                                                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                                                        personaStyles[member.persona],
                                                                )}
                                                        >
                                                                {member.persona === "resident" ? "Resident" : "Management"}
                                                        </span>
                                                </div>

                                                <div>
                                                        <span
                                                                className={cn(
                                                                        "inline-flex items-center rounded-full border px-3 py-0.5 text-sm font-medium capitalize shadow-sm",
                                                                        roleStyles[member.role] ?? "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
                                                                )}
                                                        >
                                                                {roleLabels[member.role] ?? "Role"}
                                                        </span>
                                                </div>
                                                <h1>{member.createdAt}</h1>
                                                <div>
                                                        <span
                                                                className={cn(
                                                                        "inline-flex items-center rounded-full border px-3 py-0.5 text-sm capitalize dark:bg-zinc-800",
                                                                        {
                                                                                "border-green-300 bg-green-100 text-green-700 dark:border-green-400 dark:text-green-300":
                                                                                        member.status === "active",
                                                                                "border-red-300 bg-red-100 text-red-600 dark:border-red-400 dark:text-red-300":
                                                                                        member.status === "resigned",
                                                                        },
                                                                )}
                                                        >
                                                                {member.status}
                                                        </span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                        <Button variant="outline" className="flex items-center gap-2">
                                                                <TrashIcon />
                                                                Delete
                                                        </Button>
                                                        <EditMember />
                                                </div>
                                        </div>
                                )
                        })}
                </div>
        )
}
