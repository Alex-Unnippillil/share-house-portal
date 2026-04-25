"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { DashboardSubmitButton } from "@/app/dashboard/components/dashboard-submit-button"

import { createTodo, type TodoRecord, updateTodoById } from "../actions"

const FormSchema = z.object({
  title: z.string().min(10, {
    message: "Title must be at least 10 characters.",
  }),
  completed: z.boolean(),
})

export default function TodoForm({
  isEdit,
  todo,
}: {
  isEdit: boolean
  todo?: TodoRecord
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: todo?.title ?? "",
      completed: todo?.completed ?? false,
    },
  })

  function onSubmit(data: z.infer<typeof FormSchema>) {
    startTransition(async () => {
      const result = isEdit
        ? await updateTodoById(todo?.id ?? "", {
            title: data.title,
            completed: data.completed,
          })
        : await createTodo({
            title: data.title,
            completed: data.completed,
          })

      if (!result.success) {
        toast({
          title: isEdit ? "Failed to update todo" : "Failed to create todo",
          description: result.error ?? "Unknown error",
          variant: "destructive",
        })
        return
      }

      document.getElementById(isEdit ? "update-trigger" : "create-trigger")?.click()

      toast({
        title: isEdit ? "Todo updated" : "Todo created",
        description: `${result.data?.title ?? data.title} saved successfully.`,
      })

      form.reset({
        title: result.data?.title ?? "",
        completed: result.data?.completed ?? false,
      })
      router.refresh()
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="todo title" type="text" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="completed"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Complete</FormLabel>
              </div>
            </FormItem>
          )}
        />
        <DashboardSubmitButton label="Submit" pending={isPending} />
      </form>
    </Form>
  )
}
