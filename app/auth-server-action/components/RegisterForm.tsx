import { useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { AuthResponse } from "@supabase/supabase-js"
import { useForm } from "react-hook-form"
import { AiOutlineLoading3Quarters } from "react-icons/ai"
import * as z from "zod"

import { cn } from "@/lib/utils"
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
import { signUpWithEmailAndPassword } from "@/app/auth-server-action/actions"

const RegisterSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(6, {
      message: "Password is required.",
    }),
    confirm: z.string().min(6, {
      message: "Password is required.",
    }),
  })
  .refine((data) => data.confirm === data.password, {
    message: "Password did not match",
    path: ["confirm"],
  })
export default function RegisterForm() {
  const [isPending, startTransition] = useTransition()
  const form = useForm<z.infer<typeof RegisterSchema>>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      email: "",
      password: "",
      confirm: "",
    },
  })

  function onSubmit(data: z.infer<typeof RegisterSchema>) {
    startTransition(async () => {
      const { error } = JSON.parse(
        await signUpWithEmailAndPassword(data)
      ) as AuthResponse

      if (error) {
        toast({
          title: "Sign up failed",
          description: (
            <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
              <code className="text-white">{error.message}</code>
            </pre>
          ),
        })
      } else {
        toast({
          title: "Account created 🎉",
          description:
            "Check your email to confirm your account before signing in.",
        })
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  placeholder="example@gmail.com"
                  {...field}
                  type="email"
                  onChange={field.onChange}
                />
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
                <Input
                  placeholder="password"
                  {...field}
                  type="password"
                  onChange={field.onChange}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input
                  placeholder="Confirm Password"
                  {...field}
                  type="password"
                  onChange={field.onChange}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />
        <Button className="flex w-full items-center gap-2" variant="outline">
          Register{" "}
          <AiOutlineLoading3Quarters
            className={cn(" animate-spin", { hidden: !isPending })}
          />
        </Button>
      </form>
    </Form>
  )
}
