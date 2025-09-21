"use client"

import { useTransition } from "react"
import { AiOutlineLoading3Quarters } from "react-icons/ai"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { loginWithEmailAndPassword } from "@/app/auth/actions"
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

const SignInSchema = z.object({
  email: z.string().email({ message: "Enter a valid email" }),
  password: z.string().min(1, { message: "Password is required." }),
})

export default function SignInForm() {
  const [isPending, startTransition] = useTransition()
  const form = useForm<z.infer<typeof SignInSchema>>({
    resolver: zodResolver(SignInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  function onSignInSubmit(data: z.infer<typeof SignInSchema>) {
    startTransition(async () => {
      const { error } = await loginWithEmailAndPassword(data)

      if (error) {
        toast({
          title: "Sign in failed",
          description: error.message ?? "Please check your credentials and try again.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Successful login 🎉",
      })
    })
  }

  return (
    <Form {...form}>
      <form className="w-full space-y-6" onSubmit={form.handleSubmit(onSignInSubmit)}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="example@gmail.com" type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input placeholder="password" type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className="flex w-full items-center gap-2" variant="outline" disabled={isPending}>
          Sign In
          <AiOutlineLoading3Quarters className={cn("animate-spin", { hidden: !isPending })} />
        </Button>
      </form>
    </Form>
  )
}
