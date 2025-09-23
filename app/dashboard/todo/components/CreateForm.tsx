"use client"

import { useMemo } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { AiOutlineLoading3Quarters } from "react-icons/ai"

import { Button } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"
import {
  createTodoMutationOptions,
  type CreateTodoContext,
} from "@/queries/dashboard-todos"
import { createClient } from "@/utils/supabase-browser"

const FormSchema = z.object({
  title: z.string().min(1, {
    message: "Title is required.",
  }),
})

export default function CreateForm() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: "",
    },
  })

  const supabase = useMemo(() => createClient(), [])
  const queryClient = useQueryClient()

  const createTodo = useMutation(
    createTodoMutationOptions({
      supabase,
      queryClient,
      callbacks: {
        onSuccess: (todo) => {
          toast({
            title: "Todo created",
            description: `${todo.title} added to the dashboard.`,
          })
        },
        onError: (error, context?: CreateTodoContext) => {
          if (context?.optimisticTodo) {
            form.setValue("title", context.optimisticTodo.title)
            form.setFocus("title")
          }

          toast({
            title: "Failed to create todo",
            description: error.message,
            variant: "destructive",
          })
        },
      },
    }),
  )

  function onSubmit(data: z.infer<typeof FormSchema>) {
    createTodo.mutate(data)
    form.reset()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="todo title"
                  {...field}
                  onChange={field.onChange}
                  aria-label="Todo title"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          className="flex w-full items-center gap-2"
          variant="outline"
          type="submit"
          disabled={createTodo.isPending}
        >
          Create
          <AiOutlineLoading3Quarters
            className={cn("animate-spin", { hidden: !createTodo.isPending })}
          />
        </Button>
      </form>
    </Form>
  )
}
