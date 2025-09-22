"use client"

import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { getLatestHouseRule, sortHouseRulesByVersion, type HouseRule } from "@/lib/house-rules"
import useSupabaseBrowser from "@/utils/supabase-browser"

const broadcastPayloadSchema = z.object({
  version: z.number(),
  content: z.string(),
  created_by: z.string(),
  published_at: z.string(),
})

export function HouseRulesHistory({
  initialRules,
  subscribe = true,
}: {
  initialRules: HouseRule[]
  subscribe?: boolean
}) {
  const supabase = useSupabaseBrowser()
  const { toast } = useToast()
  const sortedInitialRules = useMemo(() => sortHouseRulesByVersion(initialRules), [initialRules])
  const [rules, setRules] = useState<HouseRule[]>(sortedInitialRules)

  useEffect(() => {
    setRules(sortedInitialRules)
  }, [sortedInitialRules])

  useEffect(() => {
    if (!subscribe) {
      return
    }

    const channel = supabase.channel("house-rules")

    channel.on("broadcast", { event: "house_rules:published" }, ({ payload }) => {
      const result = broadcastPayloadSchema.safeParse(payload)

      if (!result.success) {
        console.error("Received invalid house rules broadcast", result.error)
        return
      }

      let shouldNotify = false

      setRules((previous) => {
        const existing = previous.find((rule) => rule.version === result.data.version)
        const hasChanges =
          !existing ||
          existing.content !== result.data.content ||
          existing.published_at !== result.data.published_at

        if (!hasChanges) {
          return previous
        }

        shouldNotify = true

        const nextRules = existing
          ? previous.map((rule) => (rule.version === result.data.version ? result.data : rule))
          : [result.data, ...previous]

        return sortHouseRulesByVersion(nextRules)
      })

      if (shouldNotify) {
        toast({
          title: "House rules updated",
          description: `Version ${result.data.version} is now live.`,
        })
      }
    })

    channel.subscribe().catch((error) => {
      console.error("Failed to subscribe to house rules broadcasts", error)
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [subscribe, supabase, toast])

  const latestRule = getLatestHouseRule(rules)

  return (
    <div className="space-y-4">
      {rules.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No house rules yet</CardTitle>
            <CardDescription>
              Published rules will appear here so everyone can review expectations for shared living.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        rules.map((rule) => {
          const isLatest = latestRule?.version === rule.version
          const publishedDate = new Date(rule.published_at)
          const publishedLabel = Number.isNaN(publishedDate.getTime())
            ? "Publication date unavailable"
            : format(publishedDate, "PPP p")

          return (
            <Card key={rule.version}>
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">House rules v{rule.version}</CardTitle>
                  {isLatest ? <Badge variant="secondary">Latest</Badge> : null}
                </div>
                <CardDescription>Published {publishedLabel}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm text-muted-foreground">{rule.content}</div>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
