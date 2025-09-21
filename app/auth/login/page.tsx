import Link from "next/link"
import { redirect } from "next/navigation"

import { buttonVariants } from "@/components/ui/button"
import { AuthShell } from "@/app/auth/components/auth-shell"
import AuthForm from "@/app/auth/components/AuthForm"
import { cn } from "@/lib/utils"
import { readUserSession } from "@/utils/actions"

export const metadata = {
  title: "Sign in",
  description: "Access your Share House portal account.",
}

export default async function LoginPage() {
  const {
    data: { session },
  } = await readUserSession()

  if (session) {
    redirect("/account")
  }

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to manage your account, listings, and teams."
      footer={
        <>
          By continuing you agree to our{" "}
          <Link
            href="/terms"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </>
      }
    >
      <div className="space-y-6">
        <AuthForm />
        <div className="text-center text-sm text-muted-foreground">
          New to Share House?{" "}
          <Link
            href="/onboarding"
            className={cn(
              buttonVariants({ variant: "link" }),
              "px-0 text-sm font-medium"
            )}
          >
            Create an account
          </Link>
        </div>
      </div>
    </AuthShell>
  )
}
