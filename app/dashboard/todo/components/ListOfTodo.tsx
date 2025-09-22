import React from "react";
import { TrashIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { VirtualizedList } from "@/components/ui/virtualized-list";
import EditTodo from "./EditTodo";
import { cn } from "@/lib/utils";

export default function ListOfTodo() {
	const todos = [
		{
			title: "Subscribe to my channel",
			status: "completed",
			created_at: new Date().toDateString(),
			create_by: "Garfield",
		},
		{
			title: "Subscribe to my channel",
			status: "completed",
			created_at: new Date().toDateString(),
			create_by: "Trender",
		},
		{
			title: "Subscribe to my channel",
			status: "completed",
			created_at: new Date().toDateString(),
			create_by: "Some string",
		},
	];
        const header = (
                <div className="grid grid-cols-[2fr_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-4 bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <span>Task</span>
                        <span>Status</span>
                        <span>Created</span>
                        <span>Owner</span>
                        <span className="text-right">Actions</span>
                </div>
        );

        return (
                <div className="mx-2 rounded-sm border bg-white dark:bg-inherit">
                        <VirtualizedList
                                items={todos}
                                getItemKey={(_, index) => index}
                                className="max-h-80"
                                innerClassName=""
                                staticInnerClassName=""
                                stickyHeader={header}
                                estimateSize={() => 72}
                                minItemCountForVirtualization={6}
                                renderItem={(todo, index) => {
                                        const statusClasses = cn(
                                                "rounded-full border px-2 py-1 text-xs font-medium capitalize",
                                                {
                                                        "border-emerald-400 bg-emerald-50 text-emerald-600 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300":
                                                                todo.status === "completed",
                                                        "border-muted-foreground/30 bg-muted text-muted-foreground": todo.status !== "completed",
                                                },
                                        );

                                        return (
                                                <div
                                                        className={cn(
                                                                "grid grid-cols-[2fr_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 text-sm",
                                                                index !== todos.length - 1 && "border-b border-border",
                                                        )}
                                                >
                                                        <span className="font-medium text-foreground">{todo.title}</span>
                                                        <span className="w-fit">
                                                                <span className={statusClasses}>{todo.status}</span>
                                                        </span>
                                                        <span className="text-sm text-muted-foreground">{todo.created_at}</span>
                                                        <span className="text-sm text-muted-foreground">{todo.create_by}</span>
                                                        <div className="flex items-center justify-end gap-2">
                                                                <Button variant="outline" className="bg-dark dark:bg-inherit">
                                                                        <TrashIcon />
                                                                        delete
                                                                </Button>
                                                                <EditTodo />
                                                        </div>
                                                </div>
                                        );
                                }}
                        />
                </div>
        );
}