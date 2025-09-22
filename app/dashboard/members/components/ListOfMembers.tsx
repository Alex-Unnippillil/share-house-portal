import React from "react";
import { TrashIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { VirtualizedList } from "@/components/ui/virtualized-list";
import EditMember from "./edit/EditMember";
import { cn } from "@/lib/utils";

export default function ListOfMembers() {
	const members = [
		{
			name: "Admin Member",
			role: "admin",
			created_at: new Date().toDateString(),
			status: "active",
		},
		{
			name: "Non Admin User",
			role: "user",
			created_at: new Date().toDateString(),
			status: "active",
		},
		{
			name: "Administrator",
			role: "admin",
			created_at: new Date().toDateString(),
			status: "resigned",
		},
		{
			name: "Satoshi",
			role: "user",
			created_at: new Date().toDateString(),
			status: "active",
		},
	];
        const header = (
                <div className="grid grid-cols-[2fr_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-4 bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <span>Name</span>
                        <span>Role</span>
                        <span>Joined</span>
                        <span>Status</span>
                        <span className="text-right">Actions</span>
                </div>
        );

        return (
                <div className="mx-2 rounded-sm border bg-white dark:bg-inherit">
                        <VirtualizedList
                                items={members}
                                getItemKey={(_, index) => index}
                                className="max-h-80"
                                innerClassName=""
                                staticInnerClassName=""
                                stickyHeader={header}
                                estimateSize={() => 72}
                                minItemCountForVirtualization={6}
                                renderItem={(member, index) => {
                                        const roleClasses = cn(
                                                "rounded-full border px-2 py-1 text-xs font-medium capitalize",
                                                {
                                                        "border-green-500 bg-green-200 text-green-600 dark:border-green-400 dark:bg-green-500/10 dark:text-green-300":
                                                                member.role === "admin",
                                                        "border-yellow-400 bg-yellow-50 text-yellow-700 dark:border-yellow-500 dark:bg-yellow-500/10 dark:text-yellow-300":
                                                                member.role === "user",
                                                },
                                        );

                                        const statusClasses = cn(
                                                "rounded-full border px-2 py-1 text-xs font-medium capitalize",
                                                {
                                                        "border-emerald-400 bg-emerald-50 text-emerald-600 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300":
                                                                member.status === "active",
                                                        "border-red-400 bg-red-100 text-red-600 dark:border-red-400 dark:bg-red-500/10 dark:text-red-300":
                                                                member.status === "resigned",
                                                },
                                        );

                                        return (
                                                <div
                                                        className={cn(
                                                                "grid grid-cols-[2fr_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 text-sm",
                                                                index !== members.length - 1 && "border-b border-border",
                                                        )}
                                                >
                                                        <span className="font-medium text-foreground">{member.name}</span>
                                                        <span className="w-fit">
                                                                <span className={roleClasses}>{member.role}</span>
                                                        </span>
                                                        <span className="text-sm text-muted-foreground">{member.created_at}</span>
                                                        <span className="w-fit">
                                                                <span className={statusClasses}>{member.status}</span>
                                                        </span>
                                                        <div className="flex items-center justify-end gap-2">
                                                                <Button variant="outline">
                                                                        <TrashIcon />
                                                                        Delete
                                                                </Button>
                                                                <EditMember />
                                                        </div>
                                                </div>
                                        );
                                }}
                        />
                </div>
        );
}