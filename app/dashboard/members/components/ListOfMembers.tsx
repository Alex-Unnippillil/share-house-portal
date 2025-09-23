import React from "react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/empty-states/EmptyState"
import {
        MEMBERS_EMPTY_STATE_ROUTE,
        MEMBERS_EMPTY_STATE_SAMPLES,
} from "@/components/empty-states/presets"
import { cn } from "@/lib/utils"
import { TrashIcon } from "@radix-ui/react-icons"
import { Users } from "lucide-react"

import { DashboardMember } from "../data"
import EditMember from "./edit/EditMember"

export default function ListOfMembers({ members }: { members: DashboardMember[] }) {
        if (members.length === 0) {
                return (
                        <div className="px-5 pb-8">
                                <EmptyState
                                        surface="dashboard:members"
                                        className="w-full"
                                        title="Invite your first household member"
                                        description="Track roles, onboarding progress, and payment permissions by adding roommates and managers."
                                        illustration={<Users className="size-12 text-muted-foreground" />}
                                        sampleItems={MEMBERS_EMPTY_STATE_SAMPLES}
                                        primaryAction={{
                                                href: MEMBERS_EMPTY_STATE_ROUTE,
                                                label: "Create",
                                        }}
                                />
                        </div>
                )
        }

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
                                                                        "rounded-full border-[.5px] px-2 py-1 text-sm capitalize shadow dark:bg-zinc-800",
                                                                        {
                                                                                "border-green-500 bg-green-200 text-green-600":
                                                                                        member.role === "admin",
                                                                                "border-zinc-300 bg-yellow-50 px-4 text-yellow-700 dark:border-yellow-700 dark:text-yellow-300":
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
                                                                        "rounded-full border border-zinc-300 px-2 py-1 text-sm capitalize dark:bg-zinc-800",
                                                                        {
                                                                                "bg-green-200 px-4 text-green-600 dark:border-green-400":
                                                                                        member.status === "active",
                                                                                "bg-red-100 text-red-500 dark:border-red-400 dark:text-red-300":
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
