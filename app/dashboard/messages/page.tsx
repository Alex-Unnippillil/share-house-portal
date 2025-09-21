import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { THREAD_WITH_MESSAGES_SELECT } from "@/lib/messages/queries"
import { mapThread } from "@/lib/messages/mappers"
import { isStaffRole } from "@/lib/messages/permissions"
import type { ProfileSummary, ThreadWithRelations } from "@/types/messages"
import useSupabaseServer from "@/utils/supabase-server"

import MessageBoard from "./message-board"

type PageProps = {
  searchParams?: { [key: string]: string | string[] | undefined }
}

const toProfileSummary = (profile: any): ProfileSummary => ({
  id: profile.id,
  full_name: profile.full_name,
  avatar_url: profile.avatar_url,
  role: profile.role,
  building_id: profile.building_id,
  unit_id: profile.unit_id,
})

export default async function MessagesPage({ searchParams }: PageProps) {
  const cookieStore = cookies()
  const supabase = useSupabaseServer(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role, building_id, unit_id")
    .eq("id", user.id)
    .single()

  if (profileError) {
    throw new Error(profileError.message)
  }

  if (!profile?.building_id) {
    redirect("/onboarding")
  }

  const threadQuery = supabase
    .from("threads")
    .select(THREAD_WITH_MESSAGES_SELECT)
    .eq("building_id", profile.building_id)
    .order("last_message_at", { ascending: false })
    .limit(20)

  if (!isStaffRole(profile.role)) {
    const unitFilter = profile.unit_id ? `unit_id.eq.${profile.unit_id},unit_id.is.null` : `unit_id.is.null`
    threadQuery.or(unitFilter)
  }

  const { data: threadsData, error: threadsError } = await threadQuery

  if (threadsError) {
    throw new Error(threadsError.message)
  }

  const threads: ThreadWithRelations[] = (threadsData ?? []).map(mapThread)
  const initialThreadId = typeof searchParams?.thread === "string" ? searchParams.thread : undefined

  return (
    <MessageBoard
      initialThreads={threads}
      profile={toProfileSummary(profile)}
      initialThreadId={initialThreadId}
    />
  )
}
