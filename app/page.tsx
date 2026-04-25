import { redirect } from "next/navigation"
import { readUserSession } from "@/utils/actions"

import SmartLink from "@/components/navigation/SmartLink"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default async function IndexPage() {
  const userSessionResponse = await readUserSession()

  if (userSessionResponse.data.session) {
    redirect("/dashboard")
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-10 focus:outline-none"
    >
      <Card className="w-full max-w-xl border-border/70 shadow-sm">
        <CardHeader className="space-y-3 text-center">
          <CardTitle className="text-3xl">Welcome to Roomsily</CardTitle>
          <CardDescription className="text-base">
            Sign in to manage your home, or start onboarding to set up your roommate profile and unit details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <SmartLink href="/auth" className={cn(buttonVariants({ size: "lg" }), "w-full")} intent="critical">
            Sign in
          </SmartLink>
          <SmartLink
            href="/onboarding"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}
            intent="navigation"
          >
            Start onboarding
          </SmartLink>
          <p className="pt-2 text-center text-sm text-muted-foreground">
            Need help?{" "}
            <SmartLink href="/auth?redirectTo=/support">Sign in to contact support</SmartLink>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
