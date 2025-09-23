"use client"

import { useEffect, useState } from "react"
import type { FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { persistNotificationPreferences } from "@/lib/data/preferences"
import type { DigestFrequency } from "./types"
import useSupabaseBrowser from "@/utils/supabase-browser"

interface NotificationPreferencesFormProps {
  userId: string
  preferences: {
    digestFrequency: DigestFrequency
    quietHoursStart: string | null
    quietHoursEnd: string | null
  }
}

interface FormState {
  digestFrequency: DigestFrequency
  quietHoursStart: string
  quietHoursEnd: string
}

function toInputTime(value: string | null): string {
  if (!value) return ""
  const match = value.match(/^(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : ""
}

function createStateFromPreferences(
  preferences: NotificationPreferencesFormProps["preferences"],
): FormState {
  return {
    digestFrequency: preferences.digestFrequency,
    quietHoursStart: toInputTime(preferences.quietHoursStart),
    quietHoursEnd: toInputTime(preferences.quietHoursEnd),
  }
}

export default function NotificationPreferencesForm({
  userId,
  preferences,
}: NotificationPreferencesFormProps) {
  const supabase = useSupabaseBrowser()
  const [initialState, setInitialState] = useState<FormState>(() =>
    createStateFromPreferences(preferences),
  )
  const [formState, setFormState] = useState<FormState>(initialState)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const nextState = createStateFromPreferences(preferences)
    setInitialState(nextState)
    setFormState(nextState)
  }, [
    preferences.digestFrequency,
    preferences.quietHoursStart,
    preferences.quietHoursEnd,
  ])

  const hasChanges =
    initialState.digestFrequency !== formState.digestFrequency ||
    initialState.quietHoursStart !== formState.quietHoursStart ||
    initialState.quietHoursEnd !== formState.quietHoursEnd

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!hasChanges || isSaving) return

    setIsSaving(true)
    try {
      const payload = await persistNotificationPreferences(supabase, userId, {
        digestFrequency: formState.digestFrequency,
        quietHoursStart: formState.quietHoursStart || null,
        quietHoursEnd: formState.quietHoursEnd || null,
      })

      const nextState: FormState = {
        digestFrequency: payload.digest_frequency,
        quietHoursStart: toInputTime(payload.quiet_hours_start),
        quietHoursEnd: toInputTime(payload.quiet_hours_end),
      }

      setInitialState(nextState)
      setFormState(nextState)

      toast({
        title: "Notification preferences updated",
        description: "We will respect your new digest cadence and quiet hours.",
      })
    } catch (error) {
      console.error("Failed to update notification preferences", error)
      toast({
        variant: "destructive",
        title: "Unable to save preferences",
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong while saving your notification preferences.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form
      className="grid gap-6 md:max-w-xl"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="space-y-2">
        <label
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          htmlFor="digestFrequency"
        >
          Digest cadence
        </label>
        <Select
          value={formState.digestFrequency}
          onValueChange={(value) =>
            setFormState((previous) => ({
              ...previous,
              digestFrequency: value as DigestFrequency,
            }))
          }
        >
          <SelectTrigger id="digestFrequency">
            <SelectValue placeholder="Choose a cadence" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily summary</SelectItem>
            <SelectItem value="weekly">Weekly summary</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {formState.digestFrequency === "weekly"
            ? "We'll email a weekly roll-up of new activity."
            : "We'll email a daily roll-up of new activity."}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            htmlFor="quietHoursStart"
          >
            Quiet hours start
          </label>
          <Input
            id="quietHoursStart"
            step={900}
            type="time"
            value={formState.quietHoursStart}
            onChange={(event) =>
              setFormState((previous) => ({
                ...previous,
                quietHoursStart: event.target.value,
              }))
            }
          />
        </div>
        <div className="space-y-2">
          <label
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            htmlFor="quietHoursEnd"
          >
            Quiet hours end
          </label>
          <Input
            id="quietHoursEnd"
            step={900}
            type="time"
            value={formState.quietHoursEnd}
            onChange={(event) =>
              setFormState((previous) => ({
                ...previous,
                quietHoursEnd: event.target.value,
              }))
            }
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        We'll pause digest delivery during quiet hours. Leave either time blank to
        disable the window.
      </p>
      <div>
        <Button disabled={!hasChanges || isSaving} type="submit">
          {isSaving ? "Saving..." : hasChanges ? "Save preferences" : "Preferences saved"}
        </Button>
      </div>
    </form>
  )
}
