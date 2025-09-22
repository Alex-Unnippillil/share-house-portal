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

import EditTodo from "./EditTodo";

type TodoStatus = "completed" | "in-progress" | "pending" | "blocked";

interface TodoRow {
        id: string;
        title: string;
        status: TodoStatus;
        createdAt: string;
        createdBy: string;
}

const TODO_DATA: TodoRow[] = [
        {
                id: "todo-1",
                title: "Collect roommate rent splits",
                status: "completed",
                createdAt: "2024-06-01T08:10:00.000Z",
                createdBy: "Garfield",
        },
        {
                id: "todo-2",
                title: "Schedule monthly chore review",
                status: "in-progress",
                createdAt: "2024-06-05T12:30:00.000Z",
                createdBy: "Trender",
        },
        {
                id: "todo-3",
                title: "Confirm overnight guest approvals",
                status: "pending",
                createdAt: "2024-06-07T15:42:00.000Z",
                createdBy: "Some string",
        },
        {
                id: "todo-4",
                title: "Sync utility bill receipts",
                status: "blocked",
                createdAt: "2024-06-10T09:00:00.000Z",
                createdBy: "Jess",
        },
        {
                id: "todo-5",
                title: "Update parking rotation schedule",
                status: "in-progress",
                createdAt: "2024-06-12T18:24:00.000Z",
                createdBy: "Garfield",
        },
        {
                id: "todo-6",
                title: "Send rent reminder push notification",
                status: "pending",
                createdAt: "2024-06-14T07:45:00.000Z",
                createdBy: "Trender",
        },
        {
                id: "todo-7",
                title: "Archive expired lease addendums",
                status: "completed",
                createdAt: "2024-06-16T13:18:00.000Z",
                createdBy: "Jess",
        },
        {
                id: "todo-8",
                title: "Review maintenance backlog",
                status: "pending",
                createdAt: "2024-06-18T11:05:00.000Z",
                createdBy: "Garfield",
        },
        {
                id: "todo-9",
                title: "Audit Cal.com amenity sync",
                status: "in-progress",
                createdAt: "2024-06-20T10:11:00.000Z",
                createdBy: "Trender",
        },
        {
                id: "todo-10",
                title: "Draft welcome kit updates",
                status: "completed",
                createdAt: "2024-06-22T19:22:00.000Z",
                createdBy: "Jess",
        },
];

const STATUS_LABELS: Record<TodoStatus, string> = {
        completed: "Completed",
        "in-progress": "In progress",
        pending: "Pending",
        blocked: "Blocked",
};

const STATUS_BADGE: Record<TodoStatus, { variant: "default" | "secondary" | "destructive" | "outline" | "complete"; className?: string }> = {
        completed: { variant: "complete" },
        "in-progress": { variant: "secondary", className: "text-foreground" },
        pending: { variant: "outline" },
        blocked: { variant: "destructive" },
};

const columns: ColumnDef<TodoRow>[] = [
        {
                accessorKey: "title",
                header: ({ column }) => (
                        <DataTableColumnHeader column={column} title="Title" />
                ),
                cell: ({ row }) => (
                        <span className="font-medium text-foreground">{row.original.title}</span>
                ),
                size: 280,
                minSize: 220,
        },
        {
                accessorKey: "status",
                header: ({ column }) => (
                        <DataTableColumnHeader column={column} title="Status" />
                ),
                cell: ({ row }) => {
                        const status = row.original.status;
                        const badge = STATUS_BADGE[status];
                        return (
                                <Badge
                                        variant={badge.variant}
                                        className={badge.className}
                                        aria-label={`Status ${STATUS_LABELS[status]}`}
                                >
                                        {STATUS_LABELS[status]}
                                </Badge>
                        );
                },
                size: 160,
                minSize: 140,
        },
        {
                accessorKey: "createdAt",
                header: ({ column }) => (
                        <DataTableColumnHeader column={column} title="Created" />
                ),
                cell: ({ row }) => (
                        <time dateTime={row.original.createdAt} className="text-muted-foreground">
                                {new Date(row.original.createdAt).toLocaleDateString(undefined, {
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
                accessorKey: "createdBy",
                header: ({ column }) => (
                        <DataTableColumnHeader column={column} title="Created by" />
                ),
                cell: ({ row }) => <span>{row.original.createdBy}</span>,
                size: 200,
                minSize: 160,
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
                                <Button variant="outline" size="sm" aria-label="Delete todo">
                                        <TrashIcon aria-hidden="true" />
                                </Button>
                                <EditTodo />
                        </div>
                ),
                enableSorting: false,
                size: 160,
                minSize: 140,
                enablePinning: true,
        },
];

export default function ListOfTodo() {
        const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>({
                left: ["title"],
                right: ["actions"],
        });

        return (
                <DataTable
                        columns={columns}
                        data={TODO_DATA}
                        state={{ columnPinning }}
                        onColumnPinningChange={setColumnPinning}
                        pageSizeOptions={[5, 10, 20]}
                        bodyHeight={"26rem"}
                        caption="Outstanding todo items"
                        getRowId={(row) => row.id}
                />
        );
}
