import { NextResponse } from 'next/server'
import { z } from 'zod'
import { buildObjectKey } from '@/web/features/documents/utils'
import { createSupabaseRouteClient, getCurrentUserWithProfile } from '../helpers'

const signPayloadSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  categoryId: z.string().min(1),
})

export async function POST(request: Request) {
  const payload = signPayloadSchema.safeParse(await request.json())

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
    .select('id, allowed_roles')
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

  const objectKey = buildObjectKey(payload.data.categoryId, payload.data.fileName, {
    userId: user.id,
  })

  const { data, error: signedError } = await supabase.storage.from('documents').createSignedUploadUrl(objectKey)

  if (signedError || !data) {
    return NextResponse.json({ error: signedError?.message ?? 'Unable to sign upload URL' }, { status: 500 })
  }

  return NextResponse.json({
    uploadUrl: data.signedUrl,
    path: data.path ?? objectKey,
    token: data.token ?? null,
  })
}
