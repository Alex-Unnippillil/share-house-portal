"use client"

import { useEffect, useMemo, useState } from "react"
import { useFormState, useFormStatus } from "react-dom"
import { format } from "date-fns"

import { HouseRulesHistory } from "@/components/house-rules/history-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getLatestHouseRule, sortHouseRulesByVersion, type HouseRule } from "@/lib/house-rules"

import { publishHouseRuleAction, type PublishHouseRuleState } from "./actions"

const initialState: PublishHouseRuleState = {
  success: false,
  message: null,
}

function PublishButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending || disabled} aria-disabled={pending || disabled}>
      {pending ? "Publishing…" : "Publish house rules"}
    </Button>
  )
}

export function HouseRulesAdminPanel({
  initialRules,
  canPublish,
}: {
  initialRules: HouseRule[]
  canPublish: boolean
}) {
  const sortedRules = useMemo(() => sortHouseRulesByVersion(initialRules), [initialRules])
  const latestRule = getLatestHouseRule(sortedRules)
  const [content, setContent] = useState("")
  const [state, formAction] = useFormState(publishHouseRuleAction, initialState)

  useEffect(() => {
    if (state.success) {
      setContent("")
    }
  }, [state.success])

  const nextVersion = (latestRule?.version ?? 0) + 1
  const publishedLabel = (() => {
    if (!latestRule) {
      return "No house rules published yet."
    }

    const publishedDate = new Date(latestRule.published_at)

    if (Number.isNaN(publishedDate.getTime())) {
      return `Latest version v${latestRule.version}`
    }

    return `Latest version v${latestRule.version} went live on ${format(publishedDate, "PPP p")}`
  })()

  const isSubmitDisabled = content.trim().length < 20

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">House rules</h1>
        <p className="text-muted-foreground">
          Publish updates so every roommate understands expectations. Everyone connected to the portal receives the newest
          version instantly.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Publish version v{nextVersion}</CardTitle>
            <CardDescription>{publishedLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {state.message ? (
              <p className={`text-sm ${state.success ? "text-green-600" : "text-red-600"}`}>{state.message}</p>
            ) : null}
            {canPublish ? (
              <form action={formAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="content">House rules content</Label>
                  <Textarea
                    id="content"
                    name="content"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    minLength={20}
                    rows={10}
                    placeholder="List quiet hours, shared responsibilities, guest policies, and escalation steps for your roommates."
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 20 characters. Be specific so roommates understand expectations and consequences.
                  </p>
                </div>
                <PublishButton disabled={isSubmitDisabled} />
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                You have read-only access. Contact an administrator if the house rules need to change.
              </p>
            )}
          </CardContent>
        </Card>
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Version history</h2>
            <p className="text-sm text-muted-foreground">
              Roommates can review past versions and receive realtime notifications whenever you publish an update.
            </p>
          </div>
          <HouseRulesHistory initialRules={sortedRules} />
        </section>
      </div>
    </div>
  )
}
