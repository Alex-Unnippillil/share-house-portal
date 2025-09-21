"use client"

import { useTransition } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"

import { requestPasswordReset } from "../actions"

const ResetSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email({ message: "Enter a valid email" }),
})

export function PasswordResetForm({ defaultEmail }: { defaultEmail?: string }) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<z.infer<typeof ResetSchema>>({
    resolver: zodResolver(ResetSchema),
    defaultValues: { email: defaultEmail ?? "" },
  })

  function onSubmit(data: z.infer<typeof ResetSchema>) {
    startTransition(async () => {
      const { error } = await requestPasswordReset(data)

      if (error) {
        toast({
          title: "We could not send the reset email",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Password reset email sent",
        description:
          "Check your inbox for a secure link to update your password.",
      })
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  placeholder="email@example.com"
                  autoComplete="email"
                  inputMode="email"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                We will send a secure link to this email address.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          Send reset instructions
        </Button>
      </form>
    </Form>
  )
}
