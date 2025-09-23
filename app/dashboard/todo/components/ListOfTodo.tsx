'use client';

import React, { useEffect, useState } from "react";
import { TrashIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import EditTodo from "./EditTodo";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { EditableTextCell } from "@/components/editable/editable-text-cell";
import type { DashboardTodo } from "../data";
import { updateTodoTitleAction } from "../actions/update-todo";

type ListOfTodoProps = {
        todos: DashboardTodo[];
};

export default function ListOfTodo({ todos }: ListOfTodoProps) {
        const [rows, setRows] = useState(todos);

        useEffect(() => {
                setRows(todos);
        }, [todos]);

        const handleTitleSave = (todoId: string) => async (value: string) => {
                const result = await updateTodoTitleAction({ todoId, title: value });

                if (result.success && result.data) {
                        setRows((previous) =>
                                previous.map((todo) =>
                                        todo.id === todoId
                                                ? { ...todo, title: result.data?.title ?? value }
                                                : todo,
                                ),
                        );
                }

                return result;
        };

        return (
                <div className="mx-2 rounded-sm bg-white dark:bg-inherit">
                        {rows.map((todo) => {
                                return (
                                        <div
                                                className=" grid grid-cols-5  rounded-sm  p-3 align-middle font-normal "
                                                key={todo.id}
                                        >
                                                <EditableTextCell
                                                        id={`${todo.id}-title`}
                                                        label={`${todo.title} title`}
                                                        value={todo.title}
                                                        onSave={handleTitleSave(todo.id)}
                                                        required
                                                        maxLength={160}
                                                        displayClassName="text-lg font-medium"
                                                        className="max-w-xs"
                                                        editButtonLabel="Edit"
                                                />
                                                <div className="flex items-center">
                                                        <Badge
                                                                variant={todo.completed ? "default" : "outline"}
                                                                className={cn("text-sm capitalize", {
                                                                        "bg-green-200 text-green-700 dark:bg-green-900 dark:text-green-200":
                                                                                todo.completed,
                                                                })}
                                                        >
                                                                {todo.completed ? "completed" : "pending"}
                                                        </Badge>
                                                </div>
                                                <h1 className="flex items-center text-lg dark:text-white">
                                                        {todo.createdAt}
                                                </h1>
                                                <h1 className="flex items-center text-lg dark:text-white">
                                                        {todo.createdBy}
                                                </h1>

                                                <div className="flex items-center gap-2">
                                                        <Button
                                                                variant="outline"
                                                                className="bg-dark dark:bg-inherit"
                                                        >
                                                                <TrashIcon />
                                                                delete
                                                        </Button>
                                                        <EditTodo />
                                                </div>
                                        </div>
                                );
                        })}
                </div>
        );
}
