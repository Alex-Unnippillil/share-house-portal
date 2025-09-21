"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { AuthError } from "@supabase/supabase-js"
import { useForm } from "react-hook-form"

import { Icons } from "@/components/icons"
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
import { cn } from "@/lib/utils"

import {
  loginWithEmailAndPassword,
  signInWithGithub,
  signInWithGoogle,
  signInWithTwitter,
} from "../actions"

const LoginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email({ message: "Enter a valid email" }),
  password: z.string().min(1, { message: "Password is required" }),
})

type OAuthProvider = "google" | "github" | "twitter"

const oauthActions: Record<OAuthProvider, typeof signInWithGoogle> = {
  google: signInWithGoogle,
  github: signInWithGithub,
  twitter: signInWithTwitter,
}

export default function AuthForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [oauthPending, setOauthPending] = useState<OAuthProvider | null>(null)

  const form = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  function onSubmit(data: z.infer<typeof LoginSchema>) {
    startTransition(async () => {
      const result = await loginWithEmailAndPassword(data)

      if (result.error) {
        toast({
          title: "Unable to sign in",
          description: result.error.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Welcome back",
        description: "You have been signed in successfully.",
      })
      router.refresh()
    })
  }

  function handleOAuth(provider: OAuthProvider) {
    const action = oauthActions[provider]
    setOauthPending(provider)
    startTransition(async () => {
      try {
        const { error, url } = await action()
        if (error) {
          throw error
        }
        if (url) {
          window.location.href = url
          return
        }
        setOauthPending(null)
      } catch (error) {
        const authError = error as AuthError
        toast({
          title: "SSO sign-in failed",
          description: authError?.message ?? "Please try again.",
          variant: "destructive",
        })
        setOauthPending(null)
      }
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
                <Input type="password" placeholder="password" {...field} />
              </FormControl>
              <FormDescription>
                <Link
                  href="/auth/reset-password"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </Link>
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="flex w-full items-center justify-center gap-2"
          disabled={isPending}
        >
          Sign in
          <Icons.spinner
            className={cn("size-4", {
              "animate-spin": isPending,
              "opacity-0": !isPending,
            })}
          />
        </Button>
      </form>
      <div className="space-y-4">
        <div className="relative py-1 text-center text-xs uppercase text-muted-foreground">
          <span className="bg-background px-2">Or continue with</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOAuth("google")}
            disabled={isPending || oauthPending === "google"}
            className="flex items-center justify-center gap-2"
          >
            <Icons.google className="size-4" />
            Google
            <Icons.spinner
              className={cn("size-3", {
                "animate-spin": oauthPending === "google",
                "opacity-0": oauthPending !== "google",
              })}
            />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOAuth("github")}
            disabled={isPending || oauthPending === "github"}
            className="flex items-center justify-center gap-2"
          >
            <Icons.gitHub className="size-4" />
            GitHub
            <Icons.spinner
              className={cn("size-3", {
                "animate-spin": oauthPending === "github",
                "opacity-0": oauthPending !== "github",
              })}
            />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOAuth("twitter")}
            disabled={isPending || oauthPending === "twitter"}
            className="flex items-center justify-center gap-2"
          >
            <Icons.twitter className="size-4" />
            X / Twitter
            <Icons.spinner
              className={cn("size-3", {
                "animate-spin": oauthPending === "twitter",
                "opacity-0": oauthPending !== "twitter",
              })}
            />
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Need stronger security? Set up
          <Link
            href="/auth/mfa"
            className="ml-1 font-medium text-primary underline-offset-4 hover:underline"
          >
            multi-factor authentication
          </Link>
          .
        </p>
      </div>
    </Form>
  )
}
