"use server"

import { revalidatePath } from "next/cache"

import { DASHBOARD_UNDO_WINDOW_MS } from "@/app/dashboard/constants"
import type { Database } from "@/lib/supabase"
import { createSupbaseServerClient } from "@/utils/supaone"

import type { DashboardMember } from "../data"
import { mapMemberRowToDashboard } from "../data"

const ENTITY = "dashboard_members"

type MemberRow = Database["public"]["Tables"]["dashboard_members"]["Row"]

type DeletionEventInsert = Database["public"]["Tables"]["deletion_events"]["Insert"]

function asDeletionEvent(
  record: MemberRow,
  recordId: string
): DeletionEventInsert {
  return {
    entity: ENTITY,
    record_id: recordId,
    payload: record,
    expires_at: new Date(Date.now() + DASHBOARD_UNDO_WINDOW_MS).toISOString(),
  }
}

export async function deleteMember(id: string): Promise<DashboardMember> {
  const supabase = await createSupbaseServerClient()

  const { data: deleted, error } = await supabase
    .from(ENTITY)
    .delete()
    .eq("id", id)
    .select("*")
    .single()

  if (error || !deleted) {
    throw new Error(error?.message ?? "Unable to delete member")
  }

  const { error: logError } = await supabase
    .from("deletion_events")
    .insert(asDeletionEvent(deleted, id))

  if (logError) {
    throw new Error(logError.message)
  }

  revalidatePath("/dashboard/members")
  return mapMemberRowToDashboard(deleted)
}

export async function restoreMember(member: DashboardMember) {
  const supabase = await createSupbaseServerClient()

  const { data, error } = await supabase
    .from(ENTITY)
    .upsert(
      {
        id: member.id,
        name: member.name,
        role: member.role,
        status: member.status,
        created_at: member.createdAt,
      },
      { onConflict: "id" }
    )
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to restore member")
  }

  const { error: cleanupError } = await supabase
    .from("deletion_events")
    .delete()
    .match({ entity: ENTITY, record_id: member.id })

  if (cleanupError) {
    throw new Error(cleanupError.message)
  }

  revalidatePath("/dashboard/members")

  return mapMemberRowToDashboard(data)
}
