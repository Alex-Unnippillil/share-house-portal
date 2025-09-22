"use client";

import * as React from "react";
import { ColumnDef, ColumnPinningState } from "@tanstack/react-table";
import { TrashIcon } from "@radix-ui/react-icons";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
        DataTable,
        DataTableColumnHeader,
} from "@/components/ui/data-table";

import EditMember from "./edit/EditMember";

type MemberRole = "admin" | "user" | "guest";
type MemberStatus = "active" | "resigned" | "invited";

interface MemberRow {
        id: string;
        name: string;
        role: MemberRole;
        joinedAt: string;
        status: MemberStatus;
}

const MEMBER_DATA: MemberRow[] = [
        {
                id: "member-1",
                name: "Admin Member",
                role: "admin",
                joinedAt: "2023-11-01T10:00:00.000Z",
                status: "active",
        },
        {
                id: "member-2",
                name: "Non Admin User",
                role: "user",
                joinedAt: "2023-12-15T09:12:00.000Z",
                status: "active",
        },
        {
                id: "member-3",
                name: "Administrator",
                role: "admin",
                joinedAt: "2024-01-22T18:05:00.000Z",
                status: "resigned",
        },
        {
                id: "member-4",
                name: "Satoshi",
                role: "user",
                joinedAt: "2024-02-02T13:54:00.000Z",
                status: "active",
        },
        {
                id: "member-5",
                name: "New Roommate",
                role: "guest",
                joinedAt: "2024-04-11T16:23:00.000Z",
                status: "invited",
        },
        {
                id: "member-6",
                name: "Operations Lead",
                role: "admin",
                joinedAt: "2024-05-03T08:42:00.000Z",
                status: "active",
        },
];

const ROLE_BADGE: Record<MemberRole, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "complete"; className?: string }> = {
        admin: { label: "Admin", variant: "secondary" },
        user: { label: "User", variant: "outline" },
        guest: { label: "Guest", variant: "default" },
};

const STATUS_BADGE: Record<MemberStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "complete"; className?: string }> = {
        active: { label: "Active", variant: "complete" },
        resigned: { label: "Resigned", variant: "destructive" },
        invited: { label: "Invited", variant: "secondary", className: "text-foreground" },
};

const columns: ColumnDef<MemberRow>[] = [
        {
                accessorKey: "name",
                header: ({ column }) => (
                        <DataTableColumnHeader column={column} title="Name" />
                ),
                cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
                size: 260,
                minSize: 220,
        },
        {
                accessorKey: "role",
                header: ({ column }) => (
                        <DataTableColumnHeader column={column} title="Role" />
                ),
                cell: ({ row }) => {
                        const role = ROLE_BADGE[row.original.role];
                        return (
                                <Badge
                                        variant={role.variant}
                                        className={role.className}
                                        aria-label={`Role ${role.label}`}
                                >
                                        {role.label}
                                </Badge>
                        );
                },
                size: 160,
                minSize: 140,
        },
        {
                accessorKey: "joinedAt",
                header: ({ column }) => (
                        <DataTableColumnHeader column={column} title="Joined" />
                ),
                cell: ({ row }) => (
                        <time dateTime={row.original.joinedAt} className="text-muted-foreground">
                                {new Date(row.original.joinedAt).toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                })}
                        </time>
                ),
                size: 180,
                minSize: 160,
        },
        {
                accessorKey: "status",
                header: ({ column }) => (
                        <DataTableColumnHeader column={column} title="Status" />
                ),
                cell: ({ row }) => {
                        const status = STATUS_BADGE[row.original.status];
                        return (
                                <Badge
                                        variant={status.variant}
                                        className={status.className}
                                        aria-label={`Status ${status.label}`}
                                >
                                        {status.label}
                                </Badge>
                        );
                },
                size: 160,
                minSize: 140,
        },
        {
                id: "actions",
                header: ({ column }) => (
                        <DataTableColumnHeader
                                column={column}
                                title="Actions"
                                className="justify-end"
                        />
                ),
                cell: () => (
                        <div className="flex items-center justify-end gap-2">
                                <Button variant="outline" size="sm" aria-label="Remove member">
                                        <TrashIcon aria-hidden="true" />
                                </Button>
                                <EditMember />
                        </div>
                ),
                enableSorting: false,
                size: 160,
                minSize: 140,
                enablePinning: true,
        },
];

export default function ListOfMembers() {
        const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>({
                left: ["name"],
                right: ["actions"],
        });

        return (
                <DataTable
                        columns={columns}
                        data={MEMBER_DATA}
                        state={{ columnPinning }}
                        onColumnPinningChange={setColumnPinning}
                        pageSizeOptions={[5, 10, 20]}
                        bodyHeight={"24rem"}
                        caption="Workspace members"
                        getRowId={(row) => row.id}
                />
        );
}
