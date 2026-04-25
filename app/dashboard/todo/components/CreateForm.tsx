"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

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

import { createTodo } from "../actions"

const FormSchema = z.object({
  title: z.string().min(1, {
    message: "Title is required.",
  }),
})

export default function CreateForm() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: "",
    },
  })

  function onSubmit(data: z.infer<typeof FormSchema>) {
    startTransition(async () => {
      const result = await createTodo({
        title: data.title,
      })

      if (!result.success) {
        toast({
          title: "Failed to create todo",
          description: result.error ?? "Unknown error",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Todo created",
        description: `${result.data?.title ?? data.title} was added.`,
      })

      form.reset()
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
                <Input placeholder="todo title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DashboardSubmitButton label="Create" pending={isPending} />
      </form>
    </Form>
  )
}
