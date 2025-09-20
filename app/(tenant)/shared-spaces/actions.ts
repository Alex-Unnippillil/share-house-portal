'use server'

import { cookies } from 'next/headers'

import {
  SHARED_SPACE_BUCKET,
  SIGNED_URL_TTL_SECONDS,
  normaliseSharedSpaceMetadata,
  type SharedSpaceMetadata,
} from '@/lib/shared-space-maps'
import { createClient } from '@/utils/supa-server-actions'

export type TenantSharedSpaceDiagram = {
  id: string
  title: string | null
  description: string | null
  leaseId: string
  unitId: string | null
  signedUrl: string
  bucketId: string
  metadata: SharedSpaceMetadata
  updatedAt: string
  lastUploadedAt: string
}

export type TenantSharedSpaceResponse =
  | { data: TenantSharedSpaceDiagram[]; error: null }
  | { data: null; error: string }

export async function fetchTenantSharedSpaceMaps(): Promise<TenantSharedSpaceResponse> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { data: null, error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('shared_space_maps')
    .select('*')
    .eq('tenant_profile_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }

  if (!data?.length) {
    return { data: [], error: null }
  }

  const diagrams: TenantSharedSpaceDiagram[] = []

  for (const map of data) {
    const bucketId = map.bucket_id || SHARED_SPACE_BUCKET
    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucketId)
      .createSignedUrl(map.diagram_path, SIGNED_URL_TTL_SECONDS)

    if (signedError || !signedData?.signedUrl) {
      return { data: null, error: signedError?.message ?? 'Unable to access diagram asset' }
    }

    diagrams.push({
      id: map.id,
      title: map.title,
      description: map.description,
      leaseId: map.lease_id,
      unitId: map.unit_id,
      signedUrl: signedData.signedUrl,
      bucketId,
      metadata: normaliseSharedSpaceMetadata(map),
      updatedAt: map.updated_at,
      lastUploadedAt: map.last_uploaded_at,
    })
  }

  return { data: diagrams, error: null }
}
