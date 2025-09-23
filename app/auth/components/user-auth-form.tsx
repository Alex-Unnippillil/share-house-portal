"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Icons } from "@/components/icons"
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
import { loginWithEmailAndPassword, signInWithGithub } from "../actions"
import { toast } from "@/components/ui/use-toast"
import { AuthTokenResponse } from "@supabase/supabase-js"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { AiOutlineLoading3Quarters } from "react-icons/ai"

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const LoginSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: z.string().min(1, { message: "Password can not be empty" }),
  });

  const [isGitHubLoading, setIsGitHubLoading] = React.useState<boolean>(false)

  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [isPending, startTransition] = React.useTransition();
  
  const form = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    shouldFocusError: true,
  });
  async function onSubmit(data: z.infer<typeof LoginSchema>) {
    
    setIsLoading(true)
    startTransition(async () => {
			const { error } = JSON.parse(
				await loginWithEmailAndPassword(data)
			) as AuthTokenResponse;

			if (error) {
				toast({
					title: "Login failed!",
					description: (
						<pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
							<code className="text-white">{error.message}</code>
						</pre>
					),
				});
			} else {
				toast({
					title: "Successful login 🎉",
				});
			}
		});
    setTimeout(() => {
      setIsLoading(false)
    }, 3000)
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, (errors) => {
            const fieldNames = Object.keys(errors) as Array<keyof z.infer<typeof LoginSchema>>
            if (fieldNames.length > 0) {
              form.setFocus(fieldNames[0])
            }
          })}
          className="grid gap-4"
        >
          <FormField name="email">
            <FormItem>
              <FormLabel htmlFor="email">Email</FormLabel>
              <FormControl>
                <Input
                  id="email"
                  placeholder="name@example.com"
                  type="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  disabled={isLoading}
                  {...form.register("email")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
          <FormField name="password">
            <FormItem>
              <FormLabel htmlFor="password">Password</FormLabel>
              <FormControl>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  {...form.register("password")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
          <Button
            className="flex w-full items-center gap-2"
            type="submit"
            variant="outline"
          >
            Sign In{" "}
            <AiOutlineLoading3Quarters
              className={cn(" animate-spin", { hidden: !isPending })}
            />
          </Button>
        </form>
      </Form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>
      <Button variant="outline" type="button" disabled={isLoading}>
        {isLoading ? (
          <Icons.spinner className="mr-2 size-4 animate-spin" />
        ) : (
          <Icons.gitHub className="mr-2 size-4" />
        )}{" "}
        GitHub
      </Button>
    </div>
  )
}
