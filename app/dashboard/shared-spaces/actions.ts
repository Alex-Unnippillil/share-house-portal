'use server'

import { randomUUID } from 'crypto'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { z } from 'zod'

import {
  SHARED_SPACE_BUCKET,
  SIGNED_URL_TTL_SECONDS,
  normaliseSharedSpaceMetadata,
  type SharedSpaceMetadata,
} from '@/lib/shared-space-maps'
import { createClient } from '@/utils/supa-server-actions'
import type { SharedSpaceMapInsert, SharedSpaceMapUpdate } from '@/utils/typed-supabase-client'

const DASHBOARD_PATH = '/dashboard/shared-spaces'

const metadataSchema = z
  .object({
    roomLabels: z
      .array(
        z
          .object({
            id: z.string().optional(),
            label: z.string(),
            x: z.number(),
            y: z.number(),
            description: z.string().optional().nullable(),
          })
          .passthrough()
      )
      .optional(),
    notes: z.string().optional().nullable(),
  })
  .passthrough()

type MetadataInput = z.infer<typeof metadataSchema>

type StaffActionResult = {
  status: 'success' | 'error'
  message: string
}

export type StaffSharedSpaceDiagram = {
  id: string
  leaseId: string
  unitId: string | null
  tenantId: string
  title: string | null
  description: string | null
  diagramPath: string
  bucketId: string
  signedUrl: string
  metadata: SharedSpaceMetadata
  updatedAt: string
  lastUploadedAt: string
}

async function requireStaffClient() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Not authenticated')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    throw new Error('Unable to verify permissions')
  }

  if (profile?.role !== 'admin') {
    throw new Error('You do not have access to manage shared space maps')
  }

  return { supabase, userId: user.id }
}

function parseMetadataInput(raw: FormDataEntryValue | null): MetadataInput | undefined {
  if (typeof raw !== 'string' || !raw.trim()) {
    return undefined
  }

  try {
    const parsed = JSON.parse(raw)
    return metadataSchema.parse(parsed)
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Metadata must be valid JSON: ${error.message}`)
    }
    throw new Error('Metadata must be valid JSON')
  }
}

export async function fetchStaffSharedSpaceMaps(): Promise<{
  data: StaffSharedSpaceDiagram[]
  error: string | null
}> {
  try {
    const { supabase } = await requireStaffClient()

    const { data, error } = await supabase
      .from('shared_space_maps')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      return { data: [], error: error.message }
    }

    if (!data?.length) {
      return { data: [], error: null }
    }

    const diagrams: StaffSharedSpaceDiagram[] = []

    for (const map of data) {
      const bucketId = map.bucket_id || SHARED_SPACE_BUCKET
      const { data: signed, error: signedError } = await supabase.storage
        .from(bucketId)
        .createSignedUrl(map.diagram_path, SIGNED_URL_TTL_SECONDS)

      if (signedError || !signed?.signedUrl) {
        return { data: [], error: signedError?.message ?? 'Failed to generate preview URL' }
      }

      diagrams.push({
        id: map.id,
        leaseId: map.lease_id,
        unitId: map.unit_id,
        tenantId: map.tenant_profile_id,
        title: map.title,
        description: map.description,
        diagramPath: map.diagram_path,
        bucketId,
        signedUrl: signed.signedUrl,
        metadata: normaliseSharedSpaceMetadata(map),
        updatedAt: map.updated_at,
        lastUploadedAt: map.last_uploaded_at,
      })
    }

    return { data: diagrams, error: null }
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error.message : 'Unexpected error loading shared space maps',
    }
  }
}

export async function createSharedSpaceMap(
  _prevState: StaffActionResult | null,
  formData: FormData
): Promise<StaffActionResult> {
  try {
    const { supabase, userId } = await requireStaffClient()

    const leaseId = formData.get('leaseId')
    const unitId = formData.get('unitId')
    const tenantId = formData.get('tenantId')
    const title = formData.get('title')
    const description = formData.get('description')
    const file = formData.get('diagram')
    const metadataInput = parseMetadataInput(formData.get('metadata'))

    if (typeof leaseId !== 'string' || !leaseId.trim()) {
      return { status: 'error', message: 'Lease ID is required.' }
    }

    if (typeof tenantId !== 'string' || !tenantId.trim()) {
      return { status: 'error', message: 'Tenant profile ID is required.' }
    }

    if (!(file instanceof File) || file.size === 0) {
      return { status: 'error', message: 'Please upload a diagram file.' }
    }

    const metadata = metadataInput ?? {}

    const extension = file.name.split('.').pop() ?? 'png'
    const path = `${tenantId}/${leaseId}/${randomUUID()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from(SHARED_SPACE_BUCKET)
      .upload(path, file, { upsert: false, cacheControl: '3600' })

    if (uploadError) {
      return { status: 'error', message: uploadError.message }
    }

    const payload: SharedSpaceMapInsert = {
      lease_id: leaseId,
      unit_id: typeof unitId === 'string' && unitId.trim() ? unitId : null,
      tenant_profile_id: tenantId,
      diagram_path: path,
      bucket_id: SHARED_SPACE_BUCKET,
      title: typeof title === 'string' && title.trim() ? title : null,
      description:
        typeof description === 'string' && description.trim() ? description : null,
      metadata,
      updated_by: userId,
    }

    const { error: insertError } = await supabase.from('shared_space_maps').insert(payload)

    if (insertError) {
      return { status: 'error', message: insertError.message }
    }

    revalidatePath(DASHBOARD_PATH)
    return { status: 'success', message: 'Shared space map created successfully.' }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unexpected error creating shared space map.',
    }
  }
}

export async function updateSharedSpaceMap(
  _prevState: StaffActionResult | null,
  formData: FormData
): Promise<StaffActionResult> {
  try {
    const { supabase, userId } = await requireStaffClient()

    const id = formData.get('id')
    const leaseId = formData.get('leaseId')
    const unitId = formData.get('unitId')
    const tenantId = formData.get('tenantId')
    const title = formData.get('title')
    const description = formData.get('description')
    const metadataInput = parseMetadataInput(formData.get('metadata'))
    const file = formData.get('diagram')

    if (typeof id !== 'string' || !id) {
      return { status: 'error', message: 'Invalid shared space map identifier.' }
    }

    const { data: existing, error: fetchError } = await supabase
      .from('shared_space_maps')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return { status: 'error', message: fetchError?.message ?? 'Shared space map not found.' }
    }

    const updates: SharedSpaceMapUpdate = {
      title: typeof title === 'string' ? (title.trim() ? title : null) : undefined,
      description:
        typeof description === 'string' ? (description.trim() ? description : null) : undefined,
      metadata: metadataInput ?? undefined,
      lease_id: typeof leaseId === 'string' && leaseId.trim() ? leaseId : undefined,
      unit_id:
        typeof unitId === 'string' ? (unitId.trim() ? unitId : null) : undefined,
      tenant_profile_id:
        typeof tenantId === 'string' && tenantId.trim() ? tenantId : undefined,
      updated_by: userId,
    }

    let newPath: string | undefined
    if (file instanceof File && file.size > 0) {
      const extension = file.name.split('.').pop() ?? 'png'
      newPath = `${existing.tenant_profile_id}/${existing.lease_id}/${randomUUID()}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from(existing.bucket_id || SHARED_SPACE_BUCKET)
        .upload(newPath, file, { upsert: false, cacheControl: '3600' })

      if (uploadError) {
        return { status: 'error', message: uploadError.message }
      }

      updates.diagram_path = newPath
      updates.last_uploaded_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('shared_space_maps')
      .update(updates)
      .eq('id', id)

    if (updateError) {
      if (newPath) {
        await supabase.storage
          .from(existing.bucket_id || SHARED_SPACE_BUCKET)
          .remove([newPath])
      }
      return { status: 'error', message: updateError.message }
    }

    if (newPath && existing.diagram_path) {
      await supabase.storage
        .from(existing.bucket_id || SHARED_SPACE_BUCKET)
        .remove([existing.diagram_path])
    }

    revalidatePath(DASHBOARD_PATH)
    return { status: 'success', message: 'Shared space map updated successfully.' }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unexpected error updating shared space map.',
    }
  }
}

export async function deleteSharedSpaceMap(
  _prevState: StaffActionResult | null,
  formData: FormData
): Promise<StaffActionResult> {
  try {
    const { supabase } = await requireStaffClient()
    const id = formData.get('id')

    if (typeof id !== 'string' || !id) {
      return { status: 'error', message: 'Invalid shared space map identifier.' }
    }

    const { data: existing, error: fetchError } = await supabase
      .from('shared_space_maps')
      .select('bucket_id, diagram_path')
      .eq('id', id)
      .single()

    if (fetchError) {
      return { status: 'error', message: fetchError.message }
    }

    const { error: deleteError } = await supabase
      .from('shared_space_maps')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return { status: 'error', message: deleteError.message }
    }

    if (existing?.diagram_path) {
      await supabase.storage
        .from(existing.bucket_id || SHARED_SPACE_BUCKET)
        .remove([existing.diagram_path])
    }

    revalidatePath(DASHBOARD_PATH)
    return { status: 'success', message: 'Shared space map removed.' }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unexpected error removing shared space map.',
    }
  }
}
