"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2 } from "lucide-react"

type Status = "success" | "error"

type Props = {
  status: Status
  message: string
  nextPath: string
}

export default function SsoCallbackClient({ status, message, nextPath }: Props) {
  const router = useRouter()

  useEffect(() => {
    if (status !== "success") {
      return
    }

    const timer = setTimeout(() => {
      router.push(nextPath)
    }, 1500)

    return () => clearTimeout(timer)
  }, [status, nextPath, router])

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <StatusIcon status={status} />
      <p className="text-sm text-muted-foreground">{message}</p>
      {status === "success" ? (
        <p className="text-xs text-muted-foreground">
          If you are not redirected automatically click continue.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          You can retry the sign-in process or return to the login page.
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        {status === "error" ? (
          <Button variant="outline" onClick={() => router.push("/auth/login")}>
            Back to login
          </Button>
        ) : null}
        <Button onClick={() => router.push(nextPath)}>Continue</Button>
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "success") {
    return (
      <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <CheckCircle2 className="size-6" />
      </div>
    )
  }

  return (
    <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
      <AlertCircle className="size-6" />
    </div>
  )
}
