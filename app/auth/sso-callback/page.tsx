import { AuthShell } from "@/app/auth/components/auth-shell"
import { Icons } from "@/components/icons"
import { createSupbaseServerClient } from "@/utils/supaone"
import { Suspense } from "react"

import SsoCallbackClient from "./sso-callback-status"

export const metadata = {
  title: "Completing sign-in",
  description: "Finalising your secure single sign-on process.",
}

type SearchParams = {
  code?: string
  next?: string
  error?: string
  error_description?: string
}

function sanitizeNextPath(next?: string | string[]): string {
  const path = Array.isArray(next) ? next[0] : next
  if (!path) return "/"
  if (!path.startsWith("/")) return "/"
  return path
}

async function exchangeCode(code: string) {
  const supabase = await createSupbaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  return error?.message ?? null
}

export default async function SsoCallbackPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const safeNext = sanitizeNextPath(searchParams.next)
  const hasProviderError = Boolean(searchParams.error || searchParams.error_description)
  const providerError = searchParams.error_description || searchParams.error

  let status: "success" | "error" = "success"
  let message = "You're now signed in. Redirecting you to your destination."

  if (hasProviderError) {
    status = "error"
    message = providerError ?? "We couldn't complete single sign-on."
  } else if (searchParams.code) {
    const errorMessage = await exchangeCode(searchParams.code)
    if (errorMessage) {
      status = "error"
      message = errorMessage
    }
  } else {
    status = "error"
    message = "Missing authorization code."
  }

  return (
    <AuthShell
      title="Checking your credentials"
      description="Hang tight while we complete the sign-in flow."
    >
      <Suspense fallback={<ProcessingStatus />}> 
        <SsoCallbackClient status={status} message={message} nextPath={safeNext} />
      </Suspense>
    </AuthShell>
  )
}

function ProcessingStatus() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <Icons.spinner className="size-6 animate-spin" />
      <p className="text-sm text-muted-foreground">
        Establishing a secure session…
      </p>
    </div>
  )
}
