"use client"

import { useTransition } from "react"
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
import { DashboardSubmitButton } from "@/app/(portal)/dashboard/components/dashboard-submit-button"

const FormSchema = z.object({
  title: z.string().min(1, {
    message: "Title is required.",
  }),
})

export default function CreateForm() {
  const [isPending] = useTransition()

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: "",
    },
  })

  function onSubmit(data: z.infer<typeof FormSchema>) {
    toast({
      title: "You have successfully create todo.",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{data.title} is created</code>
        </pre>
      ),
    })
    form.reset()
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
