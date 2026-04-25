"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { AuthTokenResponse } from "@supabase/supabase-js"
import { useMemo, useTransition } from "react"
import { useForm } from "react-hook-form"
import { AiOutlineLoading3Quarters } from "react-icons/ai"
import * as z from "zod"

import { cn } from "@/lib/utils"
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
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"

import {
  loginWithEmailAndPassword,
  requestPasswordReset,
  signInWithWorkOS,
  signUpWithEmailAndPassword,
  updatePassword,
} from "../actions"

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
  .regex(/[a-z]/, "Password must include at least one lowercase letter.")
  .regex(/[0-9]/, "Password must include at least one number.")

const LoginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, { message: "Password can not be empty" }),
})

const RegisterSchema = z
  .object({
    fullName: z.string().min(2, "Full name is required.").max(100),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters.")
      .max(30)
      .regex(/^[a-zA-Z0-9._-]+$/, "Username can only include letters, numbers, ., _, and -"),
    role: z.enum(["tenant", "roommate"]),
    email: z.string().email("Enter a valid email address."),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  })

const ForgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address."),
})

const ResetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  })

type AuthFormProps = {
  initialMode?: "login" | "signup" | "reset"
  notice?: string
  error?: string
}

export default function AuthForm({ initialMode = "login", notice, error }: AuthFormProps) {
  const [isPending, startTransition] = useTransition()
  const [isSignUpPending, startSignUpTransition] = useTransition()
  const [isWorkosPending, startWorkosTransition] = useTransition()
  const [isForgotPending, startForgotTransition] = useTransition()
  const [isResetPending, startResetTransition] = useTransition()

  const loginForm = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const registerForm = useForm<z.infer<typeof RegisterSchema>>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      fullName: "",
      username: "",
      role: "roommate",
      email: "",
      password: "",
      confirm: "",
    },
  })

  const forgotForm = useForm<z.infer<typeof ForgotPasswordSchema>>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  const resetForm = useForm<z.infer<typeof ResetPasswordSchema>>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      password: "",
      confirm: "",
    },
  })

  const loginSubmitLabel = useMemo(() => (isPending ? "Logging in..." : "Log In"), [isPending])

  function onLoginSubmit(data: z.infer<typeof LoginSchema>) {
    startTransition(async () => {
      const { error } = JSON.parse(await loginWithEmailAndPassword(data)) as AuthTokenResponse

      if (error) {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Successful login 🎉",
      })
    })
  }

  function onSignUpSubmit(data: z.infer<typeof RegisterSchema>) {
    startSignUpTransition(async () => {
      const { error } = JSON.parse(await signUpWithEmailAndPassword(data)) as AuthTokenResponse

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Account created",
        description: "Check your inbox to verify your email, then sign in.",
      })
      registerForm.reset()
    })
  }

  function onForgotPasswordSubmit(data: z.infer<typeof ForgotPasswordSchema>) {
    startForgotTransition(async () => {
      const { error } = JSON.parse(await requestPasswordReset(data.email)) as AuthTokenResponse

      if (error) {
        toast({
          title: "Unable to send reset email",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Reset email sent",
        description: "If the account exists, a password reset link has been sent.",
      })
      forgotForm.reset()
    })
  }

  function onResetPasswordSubmit(data: z.infer<typeof ResetPasswordSchema>) {
    startResetTransition(async () => {
      const { error } = JSON.parse(await updatePassword(data.password)) as AuthTokenResponse

      if (error) {
        toast({
          title: "Unable to reset password",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Password updated",
        description: "You can now sign in with your new password.",
      })
      resetForm.reset()
    })
  }

  function handleWorkosSignIn() {
    startWorkosTransition(async () => {
      const { error, url } = JSON.parse(await signInWithWorkOS()) as {
        error: string | null
        url: string | null
      }

      if (error || !url) {
        toast({
          title: "Unable to start SSO sign in",
          description: error ?? "A sign in URL was not returned.",
          variant: "destructive",
        })

        return
      }

      window.location.href = url
    })
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {notice ? <p className="rounded-md bg-muted p-3 text-sm">{notice}</p> : null}
      {error ? <p className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{error}</p> : null}
      <Tabs defaultValue={initialMode === "signup" ? "signup" : initialMode === "reset" ? "reset" : "login"}>
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1">
          <TabsTrigger className="px-2 text-xs sm:px-3 sm:text-sm" value="login">
            Login
          </TabsTrigger>
          <TabsTrigger className="px-2 text-xs sm:px-3 sm:text-sm" value="signup">
            Sign up
          </TabsTrigger>
          <TabsTrigger className="px-2 text-xs sm:px-3 sm:text-sm" value="reset">
            Reset
          </TabsTrigger>
        </TabsList>

        <TabsContent value="login" className="space-y-6">
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="w-full space-y-6">
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input placeholder="password" {...field} type="password" />
                    </FormControl>
                    <FormDescription>Forgot your password? Use the Reset tab to request a secure reset link.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button className="flex w-full items-center gap-2" type="submit" variant="outline" disabled={isPending}>
                {loginSubmitLabel}
                <AiOutlineLoading3Quarters className={cn(" animate-spin", { hidden: !isPending })} />
              </Button>
            </form>
          </Form>
          <div className="space-y-4">
            <Separator />
            <Button
              className="flex w-full items-center gap-2"
              disabled={isWorkosPending}
              onClick={handleWorkosSignIn}
              type="button"
              variant="outline"
            >
              Continue with SSO
              <AiOutlineLoading3Quarters className={cn(" animate-spin", { hidden: !isWorkosPending })} />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="signup">
          <Form {...registerForm}>
            <form onSubmit={registerForm.handleSubmit(onSignUpSubmit)} className="w-full space-y-4">
              <FormField
                control={registerForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jordan Blake" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="jordan-b" {...field} />
                    </FormControl>
                    <FormDescription>This is shown across roommate threads and booking activities.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account type</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        value={field.value}
                        onChange={field.onChange}
                      >
                        <option value="roommate">Roommate</option>
                        <option value="tenant">Tenant</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input placeholder="Create a strong password" {...field} type="password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="confirm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm password</FormLabel>
                    <FormControl>
                      <Input placeholder="Confirm your password" {...field} type="password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="flex w-full items-center gap-2" variant="outline" disabled={isSignUpPending}>
                Create account
                <AiOutlineLoading3Quarters className={cn(" animate-spin", { hidden: !isSignUpPending })} />
              </Button>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="reset">
          <div className="space-y-6">
            <Form {...forgotForm}>
              <form onSubmit={forgotForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-4">
                <FormField
                  control={forgotForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="email@example.com" {...field} />
                      </FormControl>
                      <FormDescription>We&apos;ll send a verification link to continue password recovery.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="flex w-full items-center gap-2" variant="outline" disabled={isForgotPending}>
                  Send reset link
                  <AiOutlineLoading3Quarters className={cn(" animate-spin", { hidden: !isForgotPending })} />
                </Button>
              </form>
            </Form>

            <Separator />

            <Form {...resetForm}>
              <form onSubmit={resetForm.handleSubmit(onResetPasswordSubmit)} className="space-y-4">
                <FormField
                  control={resetForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New password</FormLabel>
                      <FormControl>
                        <Input placeholder="New password" {...field} type="password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={resetForm.control}
                  name="confirm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm new password</FormLabel>
                      <FormControl>
                        <Input placeholder="Confirm new password" {...field} type="password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="flex w-full items-center gap-2" variant="outline" disabled={isResetPending}>
                  Update password
                  <AiOutlineLoading3Quarters className={cn(" animate-spin", { hidden: !isResetPending })} />
                </Button>
              </form>
            </Form>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
