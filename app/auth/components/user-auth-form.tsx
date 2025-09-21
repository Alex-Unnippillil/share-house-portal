"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Icons } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginWithEmailAndPassword, signInWithGithub } from "../actions"
import { toast } from "@/components/ui/use-toast"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { AiOutlineLoading3Quarters } from "react-icons/ai"

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, { message: "Password can not be empty" }),
  });
  
    const [isGitHubLoading, setIsGitHubLoading] = React.useState<boolean>(false);

const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [isPending, startTransition] = React.useTransition();
  
  const form = useForm<z.infer<typeof LoginSchema>>({
		resolver: zodResolver(LoginSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});
  async function onSubmit(data: z.infer<typeof LoginSchema>) {
    
    setIsLoading(true)
    startTransition(async () => {
      try {
        const { error } = await loginWithEmailAndPassword(data)

        if (error) {
          toast({
            title: "Login failed!",
            description: error.message,
            variant: "destructive",
          })
          return
        }

        toast({
          title: "Successful login 🎉",
        })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Please try again later."
        toast({
          title: "Login failed!",
          description: message,
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    })
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="email">
              Email
            </Label>
            <Input
              id="email"
              placeholder="name@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading}
            />
          </div>
          <Button
				className="flex w-full items-center gap-2"
				variant="outline"
			>
				Sign In{" "}
				<AiOutlineLoading3Quarters
					className={cn(" animate-spin", { hidden: !isPending })}
				/>
        </Button>
        </div>
      </form>
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
