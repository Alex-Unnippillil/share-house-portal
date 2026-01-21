import { getDashboardTodos } from "../data"
import { TodoList } from "./TodoList"

export async function TodoItems() {
        const todos = await getDashboardTodos()

        return <TodoList todos={todos} />
}
