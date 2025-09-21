"use client"

import { useState, useTransition } from "react"
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"

import { sendEmailOtp, verifyEmailOtp } from "../actions"

const RequestSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email({ message: "Enter a valid email" }),
})

const VerifySchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email({ message: "Enter a valid email" }),
  token: z
    .string({ required_error: "Enter the six-digit code" })
    .min(6, { message: "Codes are at least six digits" }),
})

type VerifyFormValues = z.infer<typeof VerifySchema>

export function MfaPanel({ defaultEmail }: { defaultEmail?: string }) {
  const [verificationSent, setVerificationSent] = useState(false)
  const [isRequestPending, startRequestTransition] = useTransition()
  const [isVerifyPending, startVerifyTransition] = useTransition()

  const requestForm = useForm<z.infer<typeof RequestSchema>>({
    resolver: zodResolver(RequestSchema),
    defaultValues: { email: defaultEmail ?? "" },
  })

  const verifyForm = useForm<VerifyFormValues>({
    resolver: zodResolver(VerifySchema),
    defaultValues: {
      email: defaultEmail ?? "",
      token: "",
    },
  })

  function handleRequest(data: z.infer<typeof RequestSchema>) {
    startRequestTransition(async () => {
      const { error } = await sendEmailOtp(data)

      if (error) {
        toast({
          title: "We could not send the verification code",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Verification code sent",
        description:
          "Check your inbox for a one-time code. It expires in five minutes.",
      })
      setVerificationSent(true)
      verifyForm.setValue("email", data.email)
    })
  }

  function handleVerify(data: VerifyFormValues) {
    startVerifyTransition(async () => {
      const { error } = await verifyEmailOtp(data)

      if (error) {
        toast({
          title: "Code verification failed",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Multi-factor verified",
        description: "Your login has been secured with an additional factor.",
      })
    })
  }

  return (
    <Tabs defaultValue="email" className="space-y-6">
      <TabsList className="w-full">
        <TabsTrigger value="email" className="flex-1">
          Email code
        </TabsTrigger>
        <TabsTrigger value="authenticator" className="flex-1">
          Authenticator app
        </TabsTrigger>
      </TabsList>
      <TabsContent value="email" className="space-y-6">
        <Form {...requestForm}>
          <form
            onSubmit={requestForm.handleSubmit(handleRequest)}
            className="space-y-4"
          >
            <FormField
              control={requestForm.control}
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
                    We will send a one-time passcode to this address.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={isRequestPending}
            >
              Send code
            </Button>
          </form>
        </Form>
        <Form {...verifyForm}>
          <form
            onSubmit={verifyForm.handleSubmit(handleVerify)}
            className="space-y-4"
          >
            <FormField
              control={verifyForm.control}
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
                    Use the same email that received the verification code.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={verifyForm.control}
              name="token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123456"
                      inputMode="numeric"
                      pattern="\\d*"
                      maxLength={12}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {verificationSent
                      ? "Enter the code from your email."
                      : "Request a code first so we know where to send it."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={isVerifyPending}
            >
              Verify and continue
            </Button>
          </form>
        </Form>
      </TabsContent>
      <TabsContent value="authenticator" className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Prefer a time-based authenticator app? Enable it from your account
          security settings after signing in. Scan the QR code generated there
          and enter the rotating codes here when prompted.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Install Google Authenticator, 1Password, or another TOTP app.</li>
          <li>
            Scan the QR code presented in the security settings of your
            dashboard.
          </li>
          <li>
            When you sign in, choose the authenticator option and provide the
            six-digit rotating code.
          </li>
        </ul>
      </TabsContent>
    </Tabs>
  )
}
