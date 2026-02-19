"use client"

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

import { createTodo, updateTodoById } from "../actions"

const FormSchema = z.object({
  title: z.string().min(10, {
    message: "Title must be at least 10 characters.",
  }),
  completed: z.boolean(),
})

export default function TodoForm({ isEdit }: { isEdit: boolean }) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: "",
      completed: false,
    },
  })

  const handleCreateMember = (data: z.infer<typeof FormSchema>) => {
    createTodo()

    document.getElementById("create-trigger")?.click()

    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    })
  }

  const handleUpdateMember = (data: z.infer<typeof FormSchema>) => {
    updateTodoById("hello")
    document.getElementById("update-trigger")?.click()

    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    })
  }

  function onSubmit(data: z.infer<typeof FormSchema>) {
    if (isEdit) {
      handleUpdateMember(data)
    } else {
      handleCreateMember(data)
    }
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
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Complete</FormLabel>
              </div>
            </FormItem>
          )}
        />
        <DashboardSubmitButton label="Submit" />
      </form>
    </Form>
  )
}
