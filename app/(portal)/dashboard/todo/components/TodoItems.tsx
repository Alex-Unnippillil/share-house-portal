import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { getDashboardTodos } from "../data"

export async function TodoItems() {
        const todos = await getDashboardTodos()

        return (
                <div className="space-y-4">
                        {todos.map((todo) => (
                                <div key={todo.id} className="flex items-center gap-6">
                                        <h1
                                                className={cn({
                                                        "line-through": todo.completed,
                                                })}
                                        >
                                                {todo.title}
                                        </h1>
                                        <Button variant="outline">Delete</Button>
                                        <Button>Update</Button>
                                </div>
                        ))}
                </div>
        )
}
