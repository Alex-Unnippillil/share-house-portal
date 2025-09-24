"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

type RotationResult = {
  clientId: string
  clientSecret: string
  keyId: string
  previousKeyId: string | null
}

export default function RotateKeyButton({
  clientId,
}: {
  clientId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<RotationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRotate = () => {
    setError(null)
    startTransition(async () => {
      setResult(null)
      try {
        const response = await fetch(
          `/api/developer/clients/${encodeURIComponent(clientId)}/rotate`,
          {
            method: "POST",
          }
        )

        const data = await response.json().catch(() => null)

        if (!response.ok) {
          const message =
            (data && typeof data.error === "string" && data.error) ||
            "Failed to rotate client secret"
          setError(message)
          toast({
            title: "Rotation failed",
            description: message,
            variant: "destructive",
          })
          return
        }

        setResult(data as RotationResult)
        toast({
          title: "Client secret rotated",
          description:
            "Copy the new secret now. The previous secret has been revoked.",
        })
        router.refresh()
      } catch (rotateError) {
        console.error("[developer] Failed to rotate OAuth client secret", rotateError)
        const message = "Network error while rotating client secret"
        setError(message)
        toast({
          title: "Network error",
          description: message,
          variant: "destructive",
        })
      }
    })
  }

  return (
    <div className="space-y-3">
      <Button onClick={handleRotate} disabled={isPending} variant="outline">
        {isPending ? "Rotating secret…" : "Rotate client secret"}
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {result ? (
        <div
          className="space-y-2 rounded-md border border-dashed bg-muted/50 p-4"
          aria-live="polite"
        >
          <p className="text-sm font-medium">New client secret</p>
          <p className="text-xs text-muted-foreground">
            Store this value immediately. The prior secret was revoked.
          </p>
          <code className="block break-all rounded bg-background px-2 py-1 text-sm">
            {result.clientSecret}
          </code>
        </div>
      ) : null}
    </div>
  )
}
