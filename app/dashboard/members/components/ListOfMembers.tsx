"use client"

import React, { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import EditableCell from "@/components/ui/editable-cell"
import { cn } from "@/lib/utils"
import { TrashIcon } from "@radix-ui/react-icons"

import { patchMember } from "../actions"
import type { DashboardMember } from "../data"

type InlineEditableField = "role" | "status"

const ROLE_OPTIONS = [
        { label: "Admin", value: "admin" },
        { label: "User", value: "user" },
]

const STATUS_OPTIONS = [
        { label: "Active", value: "active" },
        { label: "Resigned", value: "resigned" },
]

export default function ListOfMembers({ members }: { members: DashboardMember[] }) {
        const [rows, setRows] = useState(members)
        const rowsRef = useRef(rows)
        const [pendingMap, setPendingMap] = useState<Record<string, boolean>>({})

        useEffect(() => {
                setRows(members)
                rowsRef.current = members
        }, [members])

        async function commitChange(
                id: string,
                field: InlineEditableField,
                nextValue: DashboardMember[InlineEditableField],
        ) {
                const previous = rowsRef.current
                const optimistic = previous.map((member) =>
                        member.id === id ? { ...member, [field]: nextValue } : member,
                )

                rowsRef.current = optimistic
                setRows(optimistic)
                setPendingMap((prev) => ({ ...prev, [`${id}:${field}`]: true }))

                try {
                        const response = await patchMember({
                                id,
                                updates: { [field]: nextValue },
                        })

                        const merged = rowsRef.current.map((member) =>
                                member.id === id ? { ...member, ...response } : member,
                        )

                        rowsRef.current = merged
                        setRows(merged)
                } catch (error) {
                        rowsRef.current = previous
                        setRows(previous)
                        throw error
                } finally {
                        setPendingMap((prev) => {
                                const next = { ...prev }
                                delete next[`${id}:${field}`]
                                return next
                        })
                }
        }

        return (
                <div className="mx-2 rounded-sm bg-white dark:bg-inherit">
                        {rows.map((member) => {
                                const rolePending = pendingMap[`${member.id}:role`] ?? false
                                const statusPending = pendingMap[`${member.id}:status`] ?? false

                                return (
                                        <div
                                                key={member.id}
                                                className="grid grid-cols-5 items-center gap-2 rounded-sm p-3 font-normal"
                                        >
                                                <span className="flex items-center text-sm font-medium text-zinc-900 dark:text-white">
                                                        {member.name}
                                                </span>

                                                <div className="flex items-center">
                                                        <EditableCell
                                                                label={`Role for ${member.name}`}
                                                                value={member.role}
                                                                options={ROLE_OPTIONS}
                                                                pending={rolePending}
                                                                rules={{ required: "Role is required" }}
                                                                renderDisplay={(role) => (
                                                                        <span
                                                                                className={cn(
                                                                                        "rounded-full border-[.5px] px-2 py-1 text-sm capitalize shadow dark:bg-zinc-800",
                                                                                        {
                                                                                                "border-green-500 bg-green-200 text-green-600":
                                                                                                        role === "admin",
                                                                                                "border-zinc-300 bg-yellow-50 px-4 text-yellow-700 dark:border-yellow-700 dark:text-yellow-300":
                                                                                                        role === "user",
                                                                                        },
                                                                                )}
                                                                        >
                                                                                {role}
                                                                        </span>
                                                                )}
                                                                onSubmit={(value) =>
                                                                        commitChange(
                                                                                member.id,
                                                                                "role",
                                                                                value as DashboardMember["role"],
                                                                        )
                                                                }
                                                        />
                                                </div>

                                                <span className="flex items-center text-sm text-muted-foreground">
                                                        {member.createdAt}
                                                </span>

                                                <div className="flex items-center">
                                                        <EditableCell
                                                                label={`Status for ${member.name}`}
                                                                value={member.status}
                                                                options={STATUS_OPTIONS}
                                                                pending={statusPending}
                                                                rules={{ required: "Status is required" }}
                                                                renderDisplay={(status) => (
                                                                        <span
                                                                                className={cn(
                                                                                        "rounded-full border border-zinc-300 px-2 py-1 text-sm capitalize dark:bg-zinc-800",
                                                                                        {
                                                                                                "bg-green-200 px-4 text-green-600 dark:border-green-400":
                                                                                                        status === "active",
                                                                                                "bg-red-100 text-red-500 dark:border-red-400 dark:text-red-300":
                                                                                                        status === "resigned",
                                                                                        },
                                                                                )}
                                                                        >
                                                                                {status}
                                                                        </span>
                                                                )}
                                                                onSubmit={(value) =>
                                                                        commitChange(
                                                                                member.id,
                                                                                "status",
                                                                                value as DashboardMember["status"],
                                                                        )
                                                                }
                                                        />
                                                </div>

                                                <div className="flex items-center justify-end gap-2">
                                                        <Button variant="outline" className="flex items-center gap-2">
                                                                <TrashIcon />
                                                                Delete
                                                        </Button>
                                                </div>
                                        </div>
                                )
                        })}
                </div>
        )
}
