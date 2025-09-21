"use client"

import { useTransition } from "react"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

import { refreshActiveSession } from "../actions"

export function SessionRenewalCard() {
  const [isPending, startTransition] = useTransition()

  function handleRenewal() {
    startTransition(async () => {
      const { error } = await refreshActiveSession()

      if (error) {
        toast({
          title: "Session refresh failed",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Session renewed",
        description: "You&rsquo;re all set for another secure session.",
      })
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Refresh your session if you&rsquo;ve recently reset your password or signed
        in on another device. This ensures your local cookies include the
        latest security state.
      </p>
      <Button
        type="button"
        onClick={handleRenewal}
        className="w-full"
        disabled={isPending}
      >
        Refresh session
      </Button>
    </div>
  )
}
