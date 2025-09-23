'use client'

import React, { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { TrashIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"
import { EditableTextCell } from "@/components/editable/editable-text-cell"

import { DashboardMember } from "../data"
import EditMember from "./edit/EditMember"
import { updateMemberNameAction } from "../actions/update-member"

export default function ListOfMembers({ members }: { members: DashboardMember[] }) {
        const [rows, setRows] = useState(members)

        useEffect(() => {
                setRows(members)
        }, [members])

        const handleNameSave = (memberId: string) => async (value: string) => {
                const result = await updateMemberNameAction({ memberId, name: value })

                if (result.success && result.data) {
                        setRows((previous) =>
                                previous.map((member) =>
                                        member.id === memberId
                                                ? { ...member, name: result.data?.name ?? value }
                                                : member
                                )
                        )
                }

                return result
        }

        return (
                <div className="mx-2 rounded-sm bg-white dark:bg-inherit">
                        {rows.map((member) => {
                                return (
                                        <div
                                                className="grid grid-cols-5 rounded-sm p-3 align-middle font-normal"
                                                key={member.id}
                                        >
                                                <EditableTextCell
                                                        id={`${member.id}-name`}
                                                        label={`${member.name} name`}
                                                        value={member.name}
                                                        onSave={handleNameSave(member.id)}
                                                        required
                                                        maxLength={120}
                                                        displayClassName="text-base font-medium"
                                                        className="max-w-xs"
                                                        editButtonLabel="Edit"
                                                />

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
