import React from "react"

import { Button } from "@/components/ui/button"
import { TrashIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"

import { DashboardMember } from "../data"
import EditMember from "./edit/EditMember"

export default function ListOfMembers({ members }: { members: DashboardMember[] }) {
        return (
                <div className="mx-2 rounded-sm bg-white dark:bg-inherit">
                        {members.map((member, index) => {
                                return (
                                        <div
                                                className="grid grid-cols-5 rounded-sm p-3 align-middle font-normal"
                                                key={member.name + index}
                                        >
                                                <h1>{member.name}</h1>

                                                <div>
                                                        <span
                                                                className={cn(
                                                                        "rounded-full border-[.5px] px-2 py-1 text-sm capitalize shadow bg-muted",
                                                                        {
                                                                                "border-payment-paid-border bg-payment-paid-background text-payment-paid-foreground":
                                                                                        member.role === "admin",
                                                                                "border-border bg-booking-pending-background px-4 text-booking-pending-foreground border-booking-pending":
                                                                                        member.role === "user",
                                                                        },
                                                                )}
                                                        >
                                                                {member.role}
                                                        </span>
                                                </div>
                                                <h1>{member.createdAt}</h1>
                                                <div>
                                                        <span
                                                                className={cn(
                                                                        "rounded-full border border-border px-2 py-1 text-sm capitalize bg-muted",
                                                                        {
                                                                                "border-payment-paid-border bg-payment-paid-background px-4 text-payment-paid-foreground":
                                                                                        member.status === "active",
                                                                                "border-maintenance-blocked-border bg-maintenance-blocked-background text-maintenance-blocked-foreground":
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
