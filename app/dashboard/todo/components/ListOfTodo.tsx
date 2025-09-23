"use client"

import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import EditableCell from "@/components/ui/editable-cell"
import { cn } from "@/lib/utils"
import { TrashIcon } from "@radix-ui/react-icons"

import { patchTodo } from "../actions"
import EditTodo from "./EditTodo"

type TodoRecord = {
        id: string
        title: string
        status: "completed" | "pending" | "in_progress"
        created_at: string
        create_by: string
}

const STATUS_OPTIONS = [
        { label: "Completed", value: "completed" },
        { label: "In progress", value: "in_progress" },
        { label: "Pending", value: "pending" },
]

export default function ListOfTodo() {
        const [todos, setTodos] = useState<TodoRecord[]>([
                {
                        id: "todo-1",
                        title: "Subscribe to my channel",
                        status: "completed",
                        created_at: new Date().toDateString(),
                        create_by: "Garfield",
                },
                {
                        id: "todo-2",
                        title: "Subscribe to my channel",
                        status: "completed",
                        created_at: new Date().toDateString(),
                        create_by: "Trender",
                },
                {
                        id: "todo-3",
                        title: "Subscribe to my channel",
                        status: "completed",
                        created_at: new Date().toDateString(),
                        create_by: "Some string",
                },
        ])
        const todosRef = useRef(todos)
        const [pendingMap, setPendingMap] = useState<Record<string, boolean>>({})

        useEffect(() => {
                todosRef.current = todos
        }, [todos])

        async function updateStatus(id: string, nextStatus: TodoRecord["status"]) {
                const previous = todosRef.current
                const optimistic = previous.map((todo) =>
                        todo.id === id ? { ...todo, status: nextStatus } : todo,
                )

                todosRef.current = optimistic
                setTodos(optimistic)
                setPendingMap((prev) => ({ ...prev, [id]: true }))

                try {
                        const response = await patchTodo({
                                id,
                                updates: { status: nextStatus },
                        })

                        const merged = todosRef.current.map((todo) =>
                                todo.id === id ? { ...todo, ...response } : todo,
                        )

                        todosRef.current = merged
                        setTodos(merged)
                } catch (error) {
                        todosRef.current = previous
                        setTodos(previous)
                        throw error
                } finally {
                        setPendingMap((prev) => {
                                const next = { ...prev }
                                delete next[id]
                                return next
                        })
                }
        }

        return (
                <div className="mx-2 rounded-sm bg-white dark:bg-inherit">
                        {todos.map((todo) => (
                                <div
                                        className="grid grid-cols-5 items-center gap-2 rounded-sm p-3 font-normal"
                                        key={todo.id}
                                >
                                        <h1 className="flex items-center text-lg dark:text-white">
                                                {todo.title}
                                        </h1>
                                        <div className="flex items-center">
                                                <EditableCell
                                                        label={`Status for ${todo.title}`}
                                                        value={todo.status}
                                                        options={STATUS_OPTIONS}
                                                        pending={pendingMap[todo.id] ?? false}
                                                        renderDisplay={(status) => (
                                                                <span
                                                                        className={cn(
                                                                                "rounded-full border-[.5px] px-2 py-1 text-sm capitalize shadow dark:bg-zinc-800",
                                                                                {
                                                                                        "border-green-500 bg-green-400 text-green-800 dark:text-green-400":
                                                                                                status === "completed",
                                                                                        "border-yellow-500 bg-yellow-200 text-yellow-700":
                                                                                                status === "pending",
                                                                                        "border-blue-500 bg-blue-200 text-blue-700":
                                                                                                status === "in_progress",
                                                                                },
                                                                        )}
                                                                >
                                                                        {status.replace("_", " ")}
                                                                </span>
                                                        )}
                                                        onSubmit={(value) =>
                                                                updateStatus(
                                                                        todo.id,
                                                                        value as TodoRecord["status"],
                                                                )
                                                        }
                                                />
                                        </div>
                                        <h1 className="flex items-center text-lg dark:text-white">
                                                {todo.created_at}
                                        </h1>
                                        <h1 className="flex items-center text-lg dark:text-white">
                                                {todo.create_by}
                                        </h1>

                                        <div className="flex items-center gap-2">
                                                <Button
                                                        variant="outline"
                                                        className="bg-dark flex items-center gap-2 dark:bg-inherit"
                                                >
                                                        <TrashIcon />
                                                        delete
                                                </Button>
                                                <EditTodo />
                                        </div>
                                </div>
                        ))}
                </div>
        )
}
