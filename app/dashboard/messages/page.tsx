import { Metadata } from "next"
import { redirect } from "next/navigation"

import MessagesPageContent from "./components/messages-page-content"
import { createSupbaseServerClient } from "@/utils/supaone"
import type {
  BuildingRow,
  ThreadWithRelations,
  TenantAssignmentRow,
  UnitRow,
} from "@/types/messages"
import { filterThreadsByAssignments, sortThreadsForDisplay } from "@/lib/messages/permissions"

export const metadata: Metadata = {
  title: "Messages",
  description: "Collaborate with your roommates and property team in real-time.",
}

export default async function MessagesPage() {
  const supabase = await createSupbaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    redirect("/auth")
  }

  const profileId = session.user.id

  const [{ data: profileData }, { data: assignmentData }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role")
      .eq("id", profileId)
      .maybeSingle(),
    supabase
      .from("tenant_assignments")
      .select("id, building_id, unit_id, role, created_at, profile_id")
      .eq("profile_id", profileId),
  ])

  if (!profileData) {
    throw new Error("Unable to load profile")
  }

  const assignments = assignmentData ?? []
  const buildingIds = Array.from(new Set(assignments.map((assignment) => assignment.building_id)))

  let buildings: BuildingRow[] = []
  if (buildingIds.length) {
    const { data: buildingRows } = await supabase
      .from("buildings")
      .select("id, name, address, created_at, updated_at")
      .in("id", buildingIds)

    buildings = buildingRows ?? []
  }

  let units: UnitRow[] = []
  const unitIds = Array.from(
    new Set(assignments.map((assignment) => assignment.unit_id).filter(Boolean) as string[]),
  )

  if (unitIds.length) {
    const { data: unitRows } = await supabase
      .from("units")
      .select("id, label, building_id, created_at, updated_at")
      .in("id", unitIds)

    units = unitRows ?? []
  }

  let threads: ThreadWithRelations[] = []

  if (buildingIds.length) {
    const { data: threadRows } = await supabase
      .from("threads")
      .select(
        `
          id,
          building_id,
          unit_id,
          created_at,
          updated_at,
          created_by,
          title,
          category,
          metadata,
          pinned_message_id,
          is_locked,
          created_by_profile:profiles!threads_created_by_fkey (
            id,
            full_name,
            avatar_url,
            role
          ),
          messages (
            id,
            thread_id,
            parent_message_id,
            created_by,
            body,
            message_type,
            metadata,
            is_deleted,
            deleted_at,
            created_at,
            updated_at,
            created_by_profile:profiles!messages_created_by_fkey (
              id,
              full_name,
              avatar_url,
              role
            ),
            message_reactions (
              id,
              message_id,
              profile_id,
              reaction_type,
              metadata,
              created_at,
              reactor_profile:profiles!message_reactions_profile_id_fkey (
                id,
                full_name,
                avatar_url,
                role
              )
            ),
            message_moderation (
              id,
              message_id,
              moderator_id,
              action,
              reason,
              created_at,
              moderator_profile:profiles!message_moderation_moderator_id_fkey (
                id,
                full_name,
                avatar_url,
                role
              )
            )
          )
        `,
      )
      .in("building_id", buildingIds)
      .order("updated_at", { ascending: false })

    threads = threadRows ?? []
  }

  const filteredThreads = sortThreadsForDisplay(
    filterThreadsByAssignments(threads, assignments),
  )

  const props = {
    profile: profileData,
    assignments: assignments as TenantAssignmentRow[],
    buildings,
    units,
    initialThreads: filteredThreads,
  }

  return <MessagesPageContent {...props} />
}
