'use server'

import { revalidatePath } from 'next/cache'

import { createSupbaseServerClient } from '@/utils/supaone'

interface UpdateTemplatePayload {
  id: string
  name: string
  description: string | null
  category: string | null
  is_curated: boolean
}

export async function updateTemplateMetadataAction(payload: UpdateTemplatePayload) {
  const supabase = await createSupbaseServerClient()
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    throw new Error(`Unable to read session: ${sessionError.message}`)
  }

  if (!session?.user) {
    throw new Error('Not authenticated')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle()

  if (profileError) {
    throw new Error(`Failed to verify user role: ${profileError.message}`)
  }

  if (profile?.role !== 'admin') {
    throw new Error('You do not have permission to modify templates')
  }

  const normalizedName = payload.name.trim()
  const normalizedDescription = payload.description?.trim() || null
  const normalizedCategory = payload.category?.trim() || null

  if (!normalizedName) {
    throw new Error('Template name is required')
  }

  const { error } = await supabase
    .from('templates')
    .update({
      name: normalizedName,
      description: normalizedDescription,
      category: normalizedCategory,
      is_curated: payload.is_curated,
    })
    .eq('id', payload.id)

  if (error) {
    throw new Error(error.message || 'Failed to update template metadata')
  }

  revalidatePath('/dashboard/templates')

  return { success: true }
}
