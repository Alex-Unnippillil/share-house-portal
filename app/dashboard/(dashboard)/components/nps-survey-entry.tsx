"use client"

import { useCallback, useEffect, useState } from "react"

import { NpsSurveyModal } from "@/components/feedback/NpsSurveyModal"
import {
  DEFAULT_NPS_COOLDOWN_DAYS,
  DEFAULT_NPS_DISMISSAL_DAYS,
  parseIsoDate,
  shouldDisplayNpsPrompt,
} from "@/lib/feedback/prompt-logic"
import useSupabaseBrowser from "@/utils/supabase-browser"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

const DISMISSAL_PREFIX = "sharehouse:nps-dismissed"

interface NpsSurveyEntryProps {
  userId: string
}

type ActiveSurvey = {
  windowId: string
  quarterLabel: string
  dismissalKey: string
}

export function NpsSurveyEntry({ userId }: NpsSurveyEntryProps) {
  const supabase = useSupabaseBrowser()
  const client = supabase as unknown as TypedSupabaseClient
  const [activeSurvey, setActiveSurvey] = useState<ActiveSurvey | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let mounted = true

    async function hydrate() {
      const now = new Date()
      const nowIso = now.toISOString()

      const { data: windows, error: windowError } = await client
        .from('nps_survey_windows')
        .select('id, survey_year, survey_quarter, start_at, end_at')
        .lte('start_at', nowIso)
        .gte('end_at', nowIso)
        .order('start_at', { ascending: false })
        .limit(1)

      if (windowError) {
        console.error("Unable to load NPS survey window", windowError)
        return
      }

      const windowRecord = windows?.[0]
      if (!windowRecord || !mounted) {
        return
      }

      const dismissalKey = `${DISMISSAL_PREFIX}:${windowRecord.id}`

      const { data: existingResponse, error: existingError } = await client
        .from('nps_responses')
        .select('id')
        .eq('user_id', userId)
        .eq('window_id', windowRecord.id)
        .maybeSingle()

      if (existingError) {
        console.error("Unable to verify existing NPS response", existingError)
        return
      }

      const respondedInWindow = Boolean(existingResponse)

      const { data: lastResponse, error: lastResponseError } = await client
        .from('nps_responses')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastResponseError) {
        console.error("Unable to fetch last NPS response", lastResponseError)
        return
      }

      const lastResponseAt = parseIsoDate(lastResponse?.created_at ?? null)

      let dismissedAt: Date | null = null
      if (typeof window !== 'undefined') {
        const dismissalValue = window.localStorage.getItem(dismissalKey)
        dismissedAt = parseIsoDate(dismissalValue)
      }

      const shouldOpen = shouldDisplayNpsPrompt({
        hasActiveWindow: true,
        respondedInWindow,
        lastResponseAt,
        dismissedAt,
        cooldownDays: DEFAULT_NPS_COOLDOWN_DAYS,
        dismissalCooldownDays: DEFAULT_NPS_DISMISSAL_DAYS,
        now,
      })

      if (shouldOpen && mounted) {
        setActiveSurvey({
          windowId: windowRecord.id,
          quarterLabel: `Q${windowRecord.survey_quarter} ${windowRecord.survey_year}`,
          dismissalKey,
        })
        setOpen(true)
      }
    }

    void hydrate()

    return () => {
      mounted = false
    }
  }, [client, userId])

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
  }, [])

  const handleDismiss = useCallback(() => {
    if (activeSurvey && typeof window !== 'undefined') {
      window.localStorage.setItem(activeSurvey.dismissalKey, new Date().toISOString())
    }
    setOpen(false)
  }, [activeSurvey])

  const handleSubmitted = useCallback(() => {
    setOpen(false)
    setActiveSurvey(null)
  }, [])

  if (!activeSurvey) {
    return null
  }

  return (
    <NpsSurveyModal
      open={open}
      onOpenChange={handleOpenChange}
      onDismiss={handleDismiss}
      onSubmitted={handleSubmitted}
      windowId={activeSurvey.windowId}
      userId={userId}
      quarterLabel={activeSurvey.quarterLabel}
    />
  )
}
