"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, ChevronRight } from "lucide-react"
import { useForm } from "react-hook-form"
import * as z from "zod"

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
import { submitInquiry } from "@/app/contact/actions"

const ContactSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Please let us know who we’ll be speaking with." })
    .max(80, { message: "Name looks a little long—mind shortening it?" }),
  email: z.string().email({ message: "Add a valid email so we can reply." }),
  message: z
    .string()
    .min(10, { message: "Share a few more details so we can help." })
    .max(1000, { message: "Message is a bit long. Try keeping it under 1,000 characters." }),
})

type ContactValues = z.infer<typeof ContactSchema>

export function Contact() {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<ContactValues>({
    resolver: zodResolver(ContactSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  })

  async function onSubmit(values: ContactValues) {
    setIsLoading(true)

    try {
      const result = await submitInquiry(values)

      if (result.success) {
        toast({
          title: "Message sent!",
          description: "Thanks for reaching out. We’ll follow up within one business day.",
        })
        form.reset()
      } else {
        toast({
          title: "Unable to send",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "Please try again or email us directly at alex@myunni.com.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Alex Unnipillil" {...field} disabled={isLoading} autoComplete="name" />
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
                  {...field}
                  disabled={isLoading}
                  autoComplete="email"
                  inputMode="email"
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
              <FormLabel>How can we help?</FormLabel>
              <FormControl>
                <Textarea
                  rows={5}
                  placeholder="Share details about your property, household, or the support you need."
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                Give us a quick overview—amenity bookings, rent workflows, onboarding questions, or anything else on your mind.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading} className="w-full justify-center gap-2">
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Sending
            </>
          ) : (
            <>
              Send message
              <ChevronRight className="size-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </form>
    </Form>
  )
}
