import { NextResponse } from 'next/server'
import { z, type ZodType } from 'zod'
import type { DocumentVisibility } from '@/web/features/documents/types'
import { createSupabaseRouteClient, getCurrentUserWithProfile, logDocumentAudit, mapCategory, mapDocument } from './helpers'

const visibilitySchema = z.enum(['private', 'shared', 'public']) as ZodType<DocumentVisibility>

const documentPayloadSchema = z.object({
  name: z.string().min(1),
  storagePath: z.string().min(1),
  size: z.number().int().nonnegative(),
  categoryId: z.string().min(1),
  visibility: visibilitySchema,
  allowedRoles: z.array(z.string()).default([]),
  allowedUsers: z.array(z.string()).default([]),
})

export async function GET() {
  const supabase = createSupabaseRouteClient()
  const { user, profile, error } = await getCurrentUserWithProfile(supabase)

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: categoryRows, error: categoryError } = await supabase
    .from('document_categories')
    .select('id, name, description, visibility, allowed_roles, created_at, updated_at')
    .order('name', { ascending: true })

  if (categoryError) {
    return NextResponse.json({ error: categoryError.message }, { status: 500 })
  }

  const { data: documentRows, error: documentError } = await supabase
    .from('documents')
    .select(
      `id, name, category_id, storage_path, file_size, visibility, allowed_roles, allowed_users, uploaded_by, created_at, updated_at,
      category:document_categories(id, name, description, visibility, allowed_roles, created_at, updated_at),
      uploader:profiles(id, full_name, email, role)`,
    )
    .order('created_at', { ascending: false })

  if (documentError) {
    return NextResponse.json({ error: documentError.message }, { status: 500 })
  }

  return NextResponse.json({
    documents: (documentRows ?? []).map(mapDocument),
    categories: (categoryRows ?? []).map(mapCategory),
    currentUser: {
      id: user.id,
      role: profile?.role ?? 'user',
      email: profile?.email ?? null,
      name: profile?.full_name ?? null,
    },
  })
}

export async function POST(request: Request) {
  const payload = documentPayloadSchema.safeParse(await request.json())

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 })
  }

  const supabase = createSupabaseRouteClient()
  const { user, profile, error } = await getCurrentUserWithProfile(supabase)

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: categoryRow, error: categoryError } = await supabase
    .from('document_categories')
    .select('id, name, allowed_roles, visibility')
    .eq('id', payload.data.categoryId)
    .maybeSingle()

  if (categoryError) {
    return NextResponse.json({ error: categoryError.message }, { status: 500 })
  }

  if (!categoryRow) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  const userRole = (profile?.role ?? 'user').toLowerCase()
  const allowedRoles = (categoryRow.allowed_roles ?? []).map((role: string) => role.toLowerCase())

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return NextResponse.json({ error: 'You are not allowed to upload to this category' }, { status: 403 })
  }

  const { data, error: insertError } = await supabase
    .from('documents')
    .insert({
      name: payload.data.name,
      storage_path: payload.data.storagePath,
      file_size: payload.data.size,
      category_id: payload.data.categoryId,
      visibility: payload.data.visibility,
      allowed_roles: payload.data.allowedRoles,
      allowed_users: payload.data.allowedUsers,
      uploaded_by: user.id,
    })
    .select(
      `id, name, category_id, storage_path, file_size, visibility, allowed_roles, allowed_users, uploaded_by, created_at, updated_at,
      category:document_categories(id, name, description, visibility, allowed_roles, created_at, updated_at),
      uploader:profiles(id, full_name, email, role)`,
    )
    .single()

  if (insertError || !data) {
    return NextResponse.json({ error: insertError?.message ?? 'Unable to create document record' }, { status: 500 })
  }

  try {
    await logDocumentAudit(supabase, {
      documentId: data.id,
      actorId: user.id,
      action: 'uploaded',
      context: {
        size: payload.data.size,
        categoryId: payload.data.categoryId,
        visibility: payload.data.visibility,
      },
    })
  } catch (auditError) {
    return NextResponse.json({ error: (auditError as Error).message }, { status: 500 })
  }

  return NextResponse.json({ document: mapDocument(data) })
}
