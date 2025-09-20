"use client";

import React, { useMemo, useState, useTransition } from "react";
import { TrashIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import EditTodo from "./EditTodo";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Tables } from "@/lib/supabase";
import { deleteTodoById } from "../actions";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

type TodoRow = Tables<"todos">;

interface ListOfTodoProps {
        todos: TodoRow[];
        currentUserId?: string;
}

export default function ListOfTodo({ todos, currentUserId }: ListOfTodoProps) {
        const [isPending, startTransition] = useTransition();
        const [activeDelete, setActiveDelete] = useState<number | null>(null);
        const router = useRouter();

        const formattedTodos = useMemo(() => {
                return todos.map((todo) => ({
                        ...todo,
                        createdLabel: todo.created_at ? format(new Date(todo.created_at), "PP p") : "",
                        statusLabel: todo.is_complete ? "completed" : "pending",
                        createdByLabel: todo.created_by === currentUserId ? "You" : todo.created_by ?? "—",
                }));
        }, [todos, currentUserId]);

        const handleDelete = (id: number) => {
                setActiveDelete(id);
                startTransition(async () => {
                        const result = await deleteTodoById(id);

                        if (!result.success) {
                                toast({
                                        title: "Unable to delete task",
                                        description: result.error,
                                        variant: "destructive",
                                });
                                setActiveDelete(null);
                                return;
                        }

                        toast({
                                title: "Task deleted",
                                description: "The payment scheduling step has been removed.",
                        });
                        setActiveDelete(null);
                        router.refresh();
                });
        };

        if (!formattedTodos.length) {
                return (
                        <div className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                                No tasks yet. Start by adding the next action you need to take to get the payment scheduled.
                        </div>
                );
        }

        return (
                <div className="mx-2 rounded-sm bg-white dark:bg-inherit">
                        {formattedTodos.map((todo) => {
                                return (
                                        <div
                                                className="grid grid-cols-5 items-center rounded-sm p-3 align-middle font-normal"
                                                key={todo.id}
                                        >
                                                <div className="flex flex-col">
                                                        <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                                                                {todo.title || todo.task || "Untitled task"}
                                                        </span>
                                                        {todo.task && todo.task !== todo.title && (
                                                                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                                                                        {todo.task}
                                                                </span>
                                                        )}
                                                </div>
                                                <div className="flex items-center">
                                                        <span
                                                                className={cn(
                                                                        "rounded-full border px-3 py-1 text-sm capitalize",
                                                                        {
                                                                                "border-green-500 bg-green-100 text-green-700 dark:border-green-700 dark:bg-green-950/40 dark:text-green-300":
                                                                                        todo.statusLabel === "completed",
                                                                                "border-amber-500 bg-amber-100 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300":
                                                                                        todo.statusLabel !== "completed",
                                                                        },
                                                                )}
                                                        >
                                                                {todo.statusLabel}
                                                        </span>
                                                </div>
                                                <div className="flex items-center text-sm text-zinc-700 dark:text-zinc-300">
                                                        {todo.createdLabel || "—"}
                                                </div>
                                                <div className="flex items-center text-sm text-zinc-700 dark:text-zinc-300">
                                                        {todo.createdByLabel}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                        <Button
                                                                variant="outline"
                                                                className="flex items-center gap-2"
                                                                onClick={() => handleDelete(todo.id)}
                                                                disabled={isPending && activeDelete === todo.id}
                                                        >
                                                                <TrashIcon className="size-4" />
                                                                {isPending && activeDelete === todo.id ? "Removing" : "Delete"}
                                                        </Button>
                                                        <EditTodo todo={todo} />
                                                </div>
                                        </div>
                                );
                        })}
                </div>
        );
}