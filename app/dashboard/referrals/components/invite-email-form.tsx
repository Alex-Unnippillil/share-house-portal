"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"

import { CopyButton } from "./copy-button"

type InviteEmailFormProps = {
  inviterName?: string
  latestPendingInviteLink?: string
}

export function InviteEmailForm({ inviterName, latestPendingInviteLink }: InviteEmailFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/referrals/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() ? name.trim() : undefined,
        }),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result?.error ?? "Failed to send referral invite")
      }

      await response.json()

      toast({
        title: "Invite sent",
        description: `We emailed ${email.trim()} with your referral link.`,
      })

      setEmail("")
      setName("")
      router.refresh()
    } catch (error) {
      toast({
        title: "Unable to send invite",
        description: error instanceof Error ? error.message : "Please try again shortly.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send a roommate invite</CardTitle>
        <CardDescription>
          {inviterName
            ? `${inviterName}, send a quick email and we’ll generate a trackable link.`
            : "Email a roommate-to-be and we'll generate a trackable link."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
        >
          <div className="sm:col-span-1">
            <label htmlFor="invite-email" className="mb-2 block text-sm font-medium">
              Invitee email
            </label>
            <Input
              id="invite-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="roommate@example.com"
            />
          </div>

          <div className="sm:col-span-1">
            <label htmlFor="invite-name" className="mb-2 block text-sm font-medium">
              Invitee name <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="invite-name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Jamie Roommate"
            />
          </div>

          <div className="sm:col-span-1">
            <Button
              type="submit"
              className="w-full sm:w-auto"
              isLoading={isSubmitting}
              disabled={!email.trim() || isSubmitting}
            >
              Send invite
            </Button>
          </div>
        </form>

        {latestPendingInviteLink ? (
          <div className="rounded-lg border border-dashed border-primary/40 p-4">
            <p className="text-sm font-medium">Latest shareable invite link</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Copy this link to drop in texts or group chats.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <code className="max-w-full flex-1 truncate rounded-md bg-muted px-3 py-2 text-sm">
                {latestPendingInviteLink}
              </code>
              <CopyButton value={latestPendingInviteLink} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Once you send an invite we&apos;ll generate a link you can share anywhere.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
