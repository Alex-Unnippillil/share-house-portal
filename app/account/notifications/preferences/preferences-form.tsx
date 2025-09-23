"use client"

import { useCallback, useState } from "react"
import type { FormEvent, ChangeEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import {
  normalizePreferencesRow,
  normalizeTimeInput,
  type NotificationPreferences,
} from "@/lib/notification-preferences"
import useSupabaseBrowser from "@/utils/supabase-browser"

interface NotificationPreferencesFormProps {
  userId: string
  initialPreferences: NotificationPreferences
}

type FormState = {
  digestFrequency: NotificationPreferences["digestFrequency"]
  quietHoursStart: string
  quietHoursEnd: string
}

export function NotificationPreferencesForm({
  userId,
  initialPreferences,
}: NotificationPreferencesFormProps) {
  const supabase = useSupabaseBrowser()
  const [formState, setFormState] = useState<FormState>(() => ({
    digestFrequency: initialPreferences.digestFrequency,
    quietHoursStart: initialPreferences.quietHoursStart ?? "",
    quietHoursEnd: initialPreferences.quietHoursEnd ?? "",
  }))
  const [isSaving, setIsSaving] = useState(false)

  const updateField = useCallback(
    (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      setFormState((previous) => ({ ...previous, [field]: value }))
    },
    [],
  )

  const handleClearQuietHours = useCallback(() => {
    setFormState((previous) => ({
      ...previous,
      quietHoursStart: "",
      quietHoursEnd: "",
    }))
  }, [])

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setIsSaving(true)

      try {
        const quietHoursStart = normalizeTimeInput(formState.quietHoursStart)
        const quietHoursEnd = normalizeTimeInput(formState.quietHoursEnd)

        const { data, error } = await (supabase as any)
          .from("notification_preferences")
          .upsert(
            {
              user_id: userId,
              digest_frequency: formState.digestFrequency,
              quiet_hours_start: quietHoursStart ?? null,
              quiet_hours_end: quietHoursEnd ?? null,
            },
            { onConflict: "user_id" },
          )
          .select("digest_frequency, quiet_hours_start, quiet_hours_end")
          .maybeSingle()

        if (error) {
          throw error
        }

        const next = data
          ? normalizePreferencesRow(data)
          : {
              digestFrequency: formState.digestFrequency,
              quietHoursStart,
              quietHoursEnd,
            }

        setFormState({
          digestFrequency: next.digestFrequency,
          quietHoursStart: next.quietHoursStart ?? "",
          quietHoursEnd: next.quietHoursEnd ?? "",
        })

        toast({
          title: "Notification preferences updated",
          description:
            next.digestFrequency === "daily"
              ? "We will bundle alerts into a daily digest and keep nights quiet."
              : "Weekly digest scheduled. Quiet hours respected for immediate alerts.",
        })
      } catch (error) {
        console.error("Failed to save notification preferences", error)
        toast({
          variant: "destructive",
          title: "Unable to save notification preferences",
          description:
            error instanceof Error
              ? error.message
              : "Something went wrong while saving your notification settings.",
        })
      } finally {
        setIsSaving(false)
      }
    },
    [formState, supabase, userId],
  )

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="digestFrequency">Digest cadence</Label>
        <Select
          value={formState.digestFrequency}
          onValueChange={(value) =>
            setFormState((previous) => ({
              ...previous,
              digestFrequency: value as FormState["digestFrequency"],
            }))
          }
        >
          <SelectTrigger id="digestFrequency">
            <SelectValue placeholder="Choose a cadence" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily summary</SelectItem>
            <SelectItem value="weekly">Weekly round-up</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Digests collect unread alerts and send them once per period instead of
          real-time emails.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="quietHoursStart">Quiet hours start</Label>
          <Input
            id="quietHoursStart"
            type="time"
            step={900}
            value={formState.quietHoursStart}
            onChange={updateField("quietHoursStart")}
          />
          <p className="text-sm text-muted-foreground">
            Set when silence begins. Leave blank to disable quiet hours.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="quietHoursEnd">Quiet hours end</Label>
          <Input
            id="quietHoursEnd"
            type="time"
            step={900}
            value={formState.quietHoursEnd}
            onChange={updateField("quietHoursEnd")}
          />
          <p className="text-sm text-muted-foreground">
            Notifications resume after this time. Use 24-hour format.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          variant="default"
          disabled={isSaving}
        >
          {isSaving ? "Saving preferences..." : "Save preferences"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleClearQuietHours}
          disabled={isSaving}
        >
          Clear quiet hours
        </Button>
      </div>
    </form>
  )
}
