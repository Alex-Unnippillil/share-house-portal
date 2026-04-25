import { Pencil1Icon } from "@radix-ui/react-icons"

import { Button } from "@/components/ui/button"

import type { TodoRecord } from "../actions"
import DialogForm from "./DialogForm"
import TodoForm from "./TodoForm"

export default function EditTodo({ todo }: { todo: TodoRecord }) {
  return (
    <DialogForm
      id="update-trigger"
      title="Edit Todo"
      Trigger={
        <Button size="sm" variant="outline" className="gap-2">
          <Pencil1Icon />
          Edit
        </Button>
      }
      form={<TodoForm isEdit todo={todo} />}
    />
  )
}
