"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { TrashIcon } from "@radix-ui/react-icons"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

import { deleteTodoById } from "../actions"

export default function DeleteTodoButton({ todoId }: { todoId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteTodoById(todoId)

      if (!result.success) {
        toast({
          title: "Failed to delete todo",
          description: result.error ?? "Unknown error",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Todo deleted",
      })
      router.refresh()
    })
  }

  return (
    <Button size="sm" variant="outline" className="gap-2" onClick={handleDelete} disabled={isPending}>
      <TrashIcon />
      {isPending ? "Deleting..." : "Delete"}
    </Button>
  )
}
