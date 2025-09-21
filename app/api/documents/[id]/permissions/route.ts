import { NextResponse } from 'next/server'
import { z, type ZodType } from 'zod'
import type { DocumentVisibility } from '@/web/features/documents/types'
import {
  createSupabaseRouteClient,
  ensureCanEditDocument,
  getCurrentUserWithProfile,
  logDocumentAudit,
  mapDocument,
} from '../../helpers'

const visibilitySchema = z.enum(['private', 'shared', 'public']) as ZodType<DocumentVisibility>

const updateSchema = z.object({
  visibility: visibilitySchema,
  allowedRoles: z.array(z.string()).default([]),
  allowedUsers: z.array(z.string()).default([]),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const payload = updateSchema.safeParse(await request.json())

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 })
  }

  const supabase = createSupabaseRouteClient()
  const { user, profile, error } = await getCurrentUserWithProfile(supabase)

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let existing
  try {
    existing = await ensureCanEditDocument(supabase, params.id, { id: user.id, profile })
  } catch (permissionError) {
    return NextResponse.json({ error: (permissionError as Error).message }, { status: 403 })
  }

  const { data, error: updateError } = await supabase
    .from('documents')
    .update({
      visibility: payload.data.visibility,
      allowed_roles: payload.data.allowedRoles,
      allowed_users: payload.data.allowedUsers,
    })
    .eq('id', params.id)
    .select(
      `id, name, category_id, storage_path, file_size, visibility, allowed_roles, allowed_users, uploaded_by, created_at, updated_at,
      category:document_categories(id, name, description, visibility, allowed_roles, created_at, updated_at),
      uploader:profiles(id, full_name, email, role)`,
    )
    .single()

  if (updateError || !data) {
    return NextResponse.json({ error: updateError?.message ?? 'Unable to update permissions' }, { status: 500 })
  }

  try {
    await logDocumentAudit(supabase, {
      documentId: params.id,
      actorId: user.id,
      action: 'permission_updated',
      context: {
        previousVisibility: existing.visibility,
        nextVisibility: payload.data.visibility,
        allowedRoles: payload.data.allowedRoles,
        allowedUsers: payload.data.allowedUsers,
      },
    })
  } catch (auditError) {
    return NextResponse.json({ error: (auditError as Error).message }, { status: 500 })
  }

  return NextResponse.json({ document: mapDocument(data) })
}
