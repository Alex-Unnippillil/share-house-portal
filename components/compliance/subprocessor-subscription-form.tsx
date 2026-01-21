"use client"

import { useState, useTransition } from "react"

import { subscribeSubprocessorUpdates, unsubscribeSubprocessorUpdates } from "@/app/public/subprocessors/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

const modeCopy: Record<"subscribe" | "unsubscribe", { title: string; helper: string; actionLabel: string }> = {
  subscribe: {
    title: "Subscribe",
    helper: "Receive an email whenever we add, remove, or materially change a subprocessor.",
    actionLabel: "Subscribe to updates",
  },
  unsubscribe: {
    title: "Unsubscribe",
    helper: "Stop receiving compliance notifications for this email address.",
    actionLabel: "Unsubscribe",
  },
}

export function SubprocessorSubscriptionForm() {
  const [mode, setMode] = useState<"subscribe" | "unsubscribe">("subscribe")
  const [email, setEmail] = useState("")
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    startTransition(async () => {
      const action = mode === "subscribe" ? subscribeSubprocessorUpdates : unsubscribeSubprocessorUpdates
      const result = await action({ email })

      if (result.success && mode === "subscribe") {
        setEmail("")
      }

      setFeedback({ type: result.success ? "success" : "error", message: result.message })

      toast({
        title: result.success ? "Preferences saved" : "Check the details",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      })
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="flex gap-2">
        {(Object.keys(modeCopy) as Array<"subscribe" | "unsubscribe">).map((key) => (
          <Button
            key={key}
            type="button"
            variant={mode === key ? "default" : "outline"}
            onClick={() => setMode(key)}
            aria-pressed={mode === key}
            disabled={isPending}
          >
            {modeCopy[key].title}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="subprocessor-subscription-email">Email address</Label>
        <Input
          id="subprocessor-subscription-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
          disabled={isPending}
        />
        <p className="text-sm text-muted-foreground">{modeCopy[mode].helper}</p>
      </div>

      {feedback && (
        <p
          className={cn(
            "text-sm",
            feedback.type === "success"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-destructive"
          )}
        >
          {feedback.message}
        </p>
      )}

      <Button type="submit" isLoading={isPending} disabled={isPending || email.trim().length === 0}>
        {modeCopy[mode].actionLabel}
      </Button>
    </form>
  )
}
