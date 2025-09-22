import { searchTodos } from "@/lib/data/todos"
import CreateForm from "./components/CreateForm"
import SearchTodo from "./components/SearchTodo"
import TodoList from "./components/TodoList"

interface TodoPageProps {
  searchParams?: {
    q?: string | string[]
  }
}

export default async function Todo({ searchParams }: TodoPageProps = {}) {
  const queryParam = searchParams?.q
  const searchQuery = Array.isArray(queryParam) ? queryParam[0] : queryParam
  const todos = await searchTodos(searchQuery)

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="w-96 space-y-5">
        <SearchTodo />
        <CreateForm />
        <TodoList todos={todos} searchQuery={searchQuery} />
      </div>
    </div>
  )
}
