'use client'

import { useState, useTransition } from "react"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import type {
  FeatureDefinition,
  FeatureFlags,
  FeatureToggleInput,
} from "@/lib/features"

import { updateFeatureFlagAction } from "./actions"

interface FeatureToggleListProps {
  definitions: readonly FeatureDefinition[]
  householdId: string
  initialFlags: FeatureFlags
}

export default function FeatureToggleList({
  definitions,
  householdId,
  initialFlags,
}: FeatureToggleListProps) {
  const [flags, setFlags] = useState(initialFlags)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const handleToggle = (definition: FeatureDefinition) => (checked: boolean) => {
    const payload: FeatureToggleInput = {
      householdId,
      key: definition.key,
      enabled: checked,
    }

    const previousValue = Boolean(flags[definition.key])

    setFlags((current) => ({ ...current, [definition.key]: checked }))

    startTransition(async () => {
      const result = await updateFeatureFlagAction(payload)

      if (!result.success) {
        setFlags((current) => ({ ...current, [definition.key]: previousValue }))
        toast({
          title: "Unable to update feature",
          description: result.message ?? "Please try again in a few moments.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: `${definition.label} ${checked ? "enabled" : "disabled"}`,
        description: checked
          ? "Residents will immediately see the related workflows."
          : "The experience will hide this workflow for the household.",
      })
    })
  }

  return (
    <div className="space-y-4">
      {definitions.map((definition) => {
        const checked = Boolean(flags[definition.key])

        return (
          <Card key={definition.key} className="border-border/60">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle>{definition.label}</CardTitle>
                <CardDescription>{definition.description}</CardDescription>
              </div>
              <Switch
                aria-label={`Toggle ${definition.label}`}
                checked={checked}
                disabled={isPending}
                onCheckedChange={handleToggle(definition)}
              />
            </CardHeader>
          </Card>
        )
      })}
    </div>
  )
}
