'use server'

import { revalidatePath } from 'next/cache'

import type { BulkActionResult } from '@/types/bulk-actions'
import { createSupbaseServerClient } from '@/utils/supaone'

type BulkPayload = { ids: string[] }

type BulkMovePayload = BulkPayload & { destinationId: string }

type BulkTagPayload = BulkPayload & { tag: string }

type BulkExportPayload = BulkPayload & { format?: string }

type ServerClient = Awaited<ReturnType<typeof createSupbaseServerClient>>

async function withSupabaseClient(
  handler: (client: ServerClient, userId: string) => Promise<BulkActionResult>
): Promise<BulkActionResult> {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { success: false, error: 'You must be signed in to perform this action.' }
  }

  return handler(supabase, user.id)
}

function ensureIds(payload: BulkPayload): BulkActionResult | null {
  if (!payload.ids || payload.ids.length === 0) {
    return { success: false, error: 'No members were selected for the operation.' }
  }
  return null
}

export async function bulkDeleteMembers(payload: BulkPayload): Promise<BulkActionResult> {
  const validationError = ensureIds(payload)
  if (validationError) {
    return validationError
  }

  return withSupabaseClient(async (supabase, userId) => {
    const { error } = await supabase.rpc('rpc_bulk_delete_members', {
      p_member_ids: payload.ids,
      p_actor_id: userId,
    })

    if (error) {
      console.error('bulkDeleteMembers failed', error)
      return { success: false, error: 'Failed to delete the selected members.' }
    }

    revalidatePath('/dashboard/members')
    return {
      success: true,
      message: `Deleted ${payload.ids.length} member${payload.ids.length === 1 ? '' : 's'}.`,
    }
  })
}

export async function bulkMoveMembers(payload: BulkMovePayload): Promise<BulkActionResult> {
  const validationError = ensureIds(payload)
  if (validationError) {
    return validationError
  }

  if (!payload.destinationId) {
    return { success: false, error: 'A destination unit must be provided.' }
  }

  return withSupabaseClient(async (supabase, userId) => {
    const { error } = await supabase.rpc('rpc_bulk_move_members', {
      p_member_ids: payload.ids,
      p_destination_unit_id: payload.destinationId,
      p_actor_id: userId,
    })

    if (error) {
      console.error('bulkMoveMembers failed', error)
      return { success: false, error: 'Failed to move the selected members.' }
    }

    revalidatePath('/dashboard/members')
    return {
      success: true,
      message: `Moved ${payload.ids.length} member${payload.ids.length === 1 ? '' : 's'} to the selected unit.`,
    }
  })
}

export async function bulkTagMembers(payload: BulkTagPayload): Promise<BulkActionResult> {
  const validationError = ensureIds(payload)
  if (validationError) {
    return validationError
  }

  if (!payload.tag) {
    return { success: false, error: 'A tag is required to label members.' }
  }

  return withSupabaseClient(async (supabase, userId) => {
    const { error } = await supabase.rpc('rpc_bulk_tag_members', {
      p_member_ids: payload.ids,
      p_tag: payload.tag,
      p_actor_id: userId,
    })

    if (error) {
      console.error('bulkTagMembers failed', error)
      return { success: false, error: 'Failed to tag the selected members.' }
    }

    revalidatePath('/dashboard/members')
    return {
      success: true,
      message: `Applied the "${payload.tag}" tag to ${payload.ids.length} member${payload.ids.length === 1 ? '' : 's'}.`,
    }
  })
}

export async function bulkExportMembers(payload: BulkExportPayload): Promise<BulkActionResult> {
  const validationError = ensureIds(payload)
  if (validationError) {
    return validationError
  }

  const format = payload.format ?? 'csv'

  return withSupabaseClient(async (supabase, userId) => {
    const { data, error } = await supabase.rpc('rpc_bulk_export_members', {
      p_member_ids: payload.ids,
      p_format: format,
      p_actor_id: userId,
    })

    if (error) {
      console.error('bulkExportMembers failed', error)
      return { success: false, error: 'Failed to export the selected members.' }
    }

    return {
      success: true,
      message: `Started export for ${payload.ids.length} member${payload.ids.length === 1 ? '' : 's'} (${format.toUpperCase()}).`,
      data,
    }
  })
}
