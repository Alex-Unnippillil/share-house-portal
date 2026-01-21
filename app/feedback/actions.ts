"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getCurrentNpsPeriod } from "@/lib/surveys"
import { createSupbaseServerClient } from "@/utils/supaone"
import { readUserSession } from "@/utils/actions"

const npsResponseSchema = z.object({
  score: z.number().int().min(0).max(10),
  comment: z
    .string()
    .trim()
    .max(1000, "Comment is too long")
    .optional(),
})

export type SubmitNpsResponseInput = z.infer<typeof npsResponseSchema>

export async function submitNpsResponse(input: SubmitNpsResponseInput) {
  const parsed = npsResponseSchema.safeParse(input)
  if (!parsed.success) {
    return {
      error: parsed.error.flatten().formErrors.join(" ") || "Invalid feedback",
    }
  }

  const [{ data: sessionData }, supabase] = await Promise.all([
    readUserSession(),
    createSupbaseServerClient(),
  ])

  const userId = sessionData.session?.user.id
  if (!userId) {
    return { error: "You need to be signed in to share feedback." }
  }

  const surveyPeriod = getCurrentNpsPeriod()
  const payload = {
    user_id: userId,
    score: parsed.data.score,
    comment: parsed.data.comment ?? null,
    survey_period: surveyPeriod,
  }

  const { error } = await supabase
    .from('nps_responses')
    .upsert(payload, { onConflict: 'user_id,survey_period' })

  if (error) {
    console.error('Failed to persist NPS response', error)
    return { error: "We couldn't save your feedback. Please try again." }
  }

  revalidatePath("/dashboard")

  return {
    success: true as const,
    surveyPeriod,
  }
}

const csatResponseSchema = z.object({
  flow: z.string().min(1, "Flow is required"),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
})

export type RecordCsatResponseInput = z.infer<typeof csatResponseSchema>

export async function recordCsatResponse(input: RecordCsatResponseInput) {
  const parsed = csatResponseSchema.safeParse(input)
  if (!parsed.success) {
    return {
      error: parsed.error.flatten().formErrors.join(" ") || "Invalid response",
    }
  }

  const [{ data: sessionData }, supabase] = await Promise.all([
    readUserSession(),
    createSupbaseServerClient(),
  ])

  const userId = sessionData.session?.user.id ?? null

  const { data, error } = await supabase
    .from('csat_responses')
    .insert({
      user_id: userId,
      flow: parsed.data.flow,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to persist CSAT response', error)
    return { error: "We couldn't save your response. Please try again." }
  }

  return {
    success: true as const,
    responseId: data.id,
  }
}
