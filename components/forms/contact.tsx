"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronRight } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { submitInquiry } from "@/app/contact/actions"
import { useFormStatus } from "@/hooks/use-form-status"
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
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"

const contactSchema = z.object({
  name: z.string().min(1, { message: "Name can not be empty" }),
  email: z.string().email({ message: "Please provide a valid email address." }),
  message: z.string().min(1, { message: "Message can not be empty" }),
})

const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again."

type ContactValues = z.infer<typeof contactSchema>

export function Contact() {
  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  })

  const { pending, withPending } = useFormStatus(form, {
    errorField: "message",
    defaultErrorMessage: DEFAULT_ERROR_MESSAGE,
  })

  async function onSubmit(values: ContactValues) {
    try {
      await withPending(async () => {
        const result = await submitInquiry(values)

        if (!result.success) {
          throw new Error(result.message ?? DEFAULT_ERROR_MESSAGE)
        }

        toast({
          title: "Message sent!",
          description:
            "Thank you for contacting us. We will respond within 24 hours.",
        })

        form.reset()
      })
    } catch {
      // Errors are surfaced through the form state by useFormStatus.
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6 px-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Satoshi Nakamoto" disabled={pending} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  placeholder="roomsily@example.com"
                  type="email"
                  disabled={pending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea placeholder="How can we help?" disabled={pending} {...field} />
              </FormControl>
              <FormDescription>
                Share any details that will help our team respond quickly.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={pending}
          className="flex w-1/2 items-center gap-2"
          variant="outline"
        >
          Send Message
          <ChevronRight className="ml-2 size-4" />
        </Button>
      </form>
    </Form>
  )
}
