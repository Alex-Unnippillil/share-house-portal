'use client'

import { useEffect } from 'react'
import type { CSSProperties } from 'react'

import { TrashIcon } from "@radix-ui/react-icons"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useTableSelection } from "@/components/ui/Table"
import { cn } from "@/lib/utils"

import { DashboardMember } from "../data"
import EditMember from "./edit/EditMember"

const rowGridStyle = {
        gridTemplateColumns: "var(--table-grid-template)",
} satisfies CSSProperties

export default function ListOfMembers({ members }: { members: DashboardMember[] }) {
        return (
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {members.map((member) => (
                                <MemberRow key={member.id} member={member} />
                        ))}
                </div>
        )
}

function MemberRow({ member }: { member: DashboardMember }) {
        const { toggleRowSelection, isRowSelected, registerRow, unregisterRow } = useTableSelection()

        useEffect(() => {
                registerRow(member.id)
                return () => unregisterRow(member.id)
        }, [member.id, registerRow, unregisterRow])

        const selected = isRowSelected(member.id)

        return (
                <div
                        className={cn(
                                "grid items-center gap-4 px-5 py-3 text-sm transition-colors",
                                "bg-white dark:bg-inherit",
                                "last:border-b-0",
                                selected && "bg-zinc-100 dark:bg-zinc-900/60",
                        )}
                        style={rowGridStyle}
                >
                        <Checkbox
                                checked={selected}
                                onCheckedChange={() => toggleRowSelection(member.id)}
                                aria-label={`Select ${member.name}`}
                        />

                        <span className="font-medium text-zinc-900 dark:text-zinc-100">{member.name}</span>

                        <div>
                                <span
                                        className={cn(
                                                "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium capitalize",
                                                {
                                                        "border-green-500/20 bg-green-100 text-green-700 dark:border-green-400/40 dark:bg-green-900/40 dark:text-green-300":
                                                                member.role === "admin",
                                                        "border-yellow-600/20 bg-yellow-100 text-yellow-700 dark:border-yellow-400/40 dark:bg-yellow-900/30 dark:text-yellow-200":
                                                                member.role === "user",
                                                },
                                        )}
                                >
                                        {member.role}
                                </span>
                        </div>

                        <span className="text-sm text-zinc-600 dark:text-zinc-300">{member.createdAt}</span>

                        <div>
                                <span
                                        className={cn(
                                                "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium capitalize",
                                                {
                                                        "border-green-500/20 bg-green-100 text-green-700 dark:border-green-400/40 dark:bg-green-900/40 dark:text-green-300":
                                                                member.status === "active",
                                                        "border-red-500/20 bg-red-100 text-red-600 dark:border-red-400/40 dark:bg-red-900/40 dark:text-red-300":
                                                                member.status === "resigned",
                                                },
                                        )}
                                >
                                        {member.status}
                                </span>
                        </div>

                        <div className="flex items-center justify-end gap-2">
                                <Button variant="outline" className="flex items-center gap-2">
                                        <TrashIcon />
                                        Delete
                                </Button>
                                <EditMember />
                        </div>
                </div>
        )
}
