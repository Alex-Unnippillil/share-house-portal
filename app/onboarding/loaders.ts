"use server"

import { redirect } from "next/navigation"

import { createSupabaseServerClientReadOnly } from "@/utils/supaone"
import { computeOnboardingCompletion } from "@/lib/onboarding"

type OnboardingMetadata = {
  emergency_contact?: {
    name?: string
    phone?: string
    relationship?: string
  }
  vehicle_details?: {
    make?: string
    model?: string
    color?: string
    licensePlate?: string
  }
  onboarding?: {
    completed_steps?: string[]
    completion_percent?: number
  }
  personal_documents?: Array<{
    path: string
    name: string
    size: number
    mimeType: string
    uploadedAt: string
  }>
}

export async function loadOnboardingState() {
  const supabase = await createSupabaseServerClientReadOnly()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("unit_id, rent_share, avatar_url, metadata")
    .eq("id", user.id)
    .single()

  const metadata = ((profile?.metadata as OnboardingMetadata | null) ?? {})
  const completion = computeOnboardingCompletion(metadata.onboarding?.completed_steps ?? [])

  let avatarSignedUrl: string | null = null

  if (profile?.avatar_url) {
    const { data } = await supabase.storage.from("avatars").createSignedUrl(profile.avatar_url, 60 * 30)
    avatarSignedUrl = data?.signedUrl ?? null
  }

  const docs = metadata.personal_documents ?? []
  const docsWithUrls = await Promise.all(
    docs.map(async (doc) => {
      const { data } = await supabase.storage.from("personal-documents").createSignedUrl(doc.path, 60 * 30)
      return {
        ...doc,
        signedUrl: data?.signedUrl ?? null,
      }
    }),
  )

  return {
    user: {
      id: user.id,
      email: user.email ?? "",
    },
    profile: {
      unitId: profile?.unit_id ?? "",
      rentShare: profile?.rent_share ?? undefined,
      avatarPath: profile?.avatar_url ?? "",
      avatarSignedUrl,
      emergencyContact: metadata.emergency_contact,
      vehicleDetails: metadata.vehicle_details,
      personalDocuments: docsWithUrls,
      completion,
    },
  }
}
