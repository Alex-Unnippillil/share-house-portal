'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'

import { createClient } from '@/utils/supa-server-actions'
import type { Database } from '@/lib/supabase'

const STAFF_ROLES = new Set(['admin', 'staff'])
const LEASE_BUCKET = 'lease-documents'

type TypedSupabaseClient = SupabaseClient<Database>
type LeaseRow = Database['public']['Tables']['leases']['Row']
type LeaseDocumentRow = Database['public']['Tables']['lease_documents']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']

type StaffProfile = Pick<ProfileRow, 'id' | 'role' | 'full_name' | 'email'>

type UploadResult = {
  success: boolean
  error?: string
}

type LeaseOverviewEntry = {
  lease: LeaseRow
  tenant: Pick<ProfileRow, 'id' | 'full_name' | 'email'> | null
  documents: LeaseDocumentWithUrl[]
}

type LeaseOverviewResult = {
  data: LeaseOverviewEntry[]
  error?: string
  unauthorized?: boolean
}

type TenantLeaseDocument = LeaseDocumentWithUrl & {
  lease: LeaseRow | null
}

type TenantLeaseDocumentsResult = {
  data: TenantLeaseDocument[]
  error?: string
  unauthorized?: boolean
  requiresAuth?: boolean
}

export type LeaseDocumentWithUrl = LeaseDocumentRow & {
  downloadUrl: string | null
}

const uploadSchema = z.object({
  leaseId: z.string().uuid({ message: 'A valid lease is required.' }),
  title: z.string().min(1, 'Document title is required.'),
  effectiveDate: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Effective date must be a valid date.'),
  documentId: z.string().uuid().optional(),
})

async function getSupabaseClient() {
  const cookieStore = cookies()
  return createClient(cookieStore)
}

function isStaff(profile: ProfileRow | null): profile is StaffProfile {
  if (!profile?.role) return false
  return STAFF_ROLES.has(profile.role)
}

async function fetchCurrentProfile(supabase: TypedSupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, error: error?.message ?? 'Not authenticated.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, full_name, email')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return { user, error: profileError?.message ?? 'Profile not found.' }
  }

  return { user, profile, error: null }
}

async function withSignedUrls(
  supabase: TypedSupabaseClient,
  documents: LeaseDocumentRow[]
): Promise<LeaseDocumentWithUrl[]> {
  if (!documents.length) return []

  const results = await Promise.all(
    documents.map(async (doc) => {
      const { data, error } = await supabase.storage
        .from(LEASE_BUCKET)
        .createSignedUrl(doc.storage_path, 60 * 60)

      return {
        ...doc,
        downloadUrl: error ? null : data?.signedUrl ?? null,
      }
    })
  )

  return results
}

export async function uploadLeaseDocument(formData: FormData): Promise<UploadResult> {
  const supabase = await getSupabaseClient()
  const { profile, error: authError } = await fetchCurrentProfile(supabase)

  if (authError || !profile) {
    return { success: false, error: authError ?? 'You must be signed in.' }
  }

  if (!isStaff(profile)) {
    return { success: false, error: 'Only staff members can manage lease documents.' }
  }

  const parsed = uploadSchema.safeParse({
    leaseId: formData.get('leaseId'),
    title: formData.get('title'),
    effectiveDate: formData.get('effectiveDate'),
    documentId: formData.get('documentId') || undefined,
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid form submission.' }
  }

  const { leaseId, title, effectiveDate, documentId } = parsed.data

  const rawExpiration = formData.get('expirationDate')
  const expirationDate =
    typeof rawExpiration === 'string' && rawExpiration.length > 0 ? rawExpiration : null

  if (expirationDate && Number.isNaN(Date.parse(expirationDate))) {
    return { success: false, error: 'Expiration date must be a valid date.' }
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return { success: false, error: 'A PDF document must be provided.' }
  }

  if (file.size === 0) {
    return { success: false, error: 'The uploaded file is empty.' }
  }

  if (file.type !== 'application/pdf') {
    return { success: false, error: 'Only PDF documents are supported.' }
  }

  const { data: lease, error: leaseError } = await supabase
    .from('leases')
    .select('id')
    .eq('id', leaseId)
    .maybeSingle()

  if (leaseError || !lease) {
    return { success: false, error: 'The selected lease could not be found.' }
  }

  let documentPath: string
  let version = 1

  if (documentId) {
    const { data: existingDocument, error: existingError } = await supabase
      .from('lease_documents')
      .select('id, lease_id, storage_path, version')
      .eq('id', documentId)
      .maybeSingle()

    if (existingError || !existingDocument) {
      return { success: false, error: 'The lease document to replace was not found.' }
    }

    if (existingDocument.lease_id !== leaseId) {
      return { success: false, error: 'This document does not belong to the selected lease.' }
    }

    documentPath = existingDocument.storage_path
    version = existingDocument.version + 1
  } else {
    const { data: latestVersion } = await supabase
      .from('lease_documents')
      .select('version')
      .eq('lease_id', leaseId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    version = latestVersion?.version ? latestVersion.version + 1 : 1
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-]/g, '_')
    documentPath = `${leaseId}/${randomUUID()}-${sanitizedName}`
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadError } = await supabase.storage.from(LEASE_BUCKET).upload(documentPath, fileBuffer, {
    contentType: 'application/pdf',
    upsert: true,
  })

  if (uploadError) {
    return { success: false, error: uploadError.message }
  }

  if (documentId) {
    const { error: updateError } = await supabase
      .from('lease_documents')
      .update({
        storage_path: documentPath,
        title,
        effective_date: effectiveDate,
        expiration_date: expirationDate,
        version,
      })
      .eq('id', documentId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }
  } else {
    const { error: insertError } = await supabase.from('lease_documents').insert({
      lease_id: leaseId,
      storage_path: documentPath,
      title,
      effective_date: effectiveDate,
      expiration_date: expirationDate,
      version,
    })

    if (insertError) {
      await supabase.storage.from(LEASE_BUCKET).remove([documentPath])
      return { success: false, error: insertError.message }
    }
  }

  revalidatePath('/dashboard/leases')
  revalidatePath('/leases')

  return { success: true }
}

export async function fetchLeaseOverview(): Promise<LeaseOverviewResult> {
  const supabase = await getSupabaseClient()
  const { profile, error: authError } = await fetchCurrentProfile(supabase)

  if (authError || !profile) {
    return { data: [], error: authError ?? 'Unable to authenticate.', unauthorized: true }
  }

  if (!isStaff(profile)) {
    return { data: [], error: 'Only staff members can view leases.', unauthorized: true }
  }

  const { data: leases, error: leasesError } = await supabase
    .from('leases')
    .select('*')
    .order('created_at', { ascending: false })

  if (leasesError || !leases) {
    return { data: [], error: leasesError?.message ?? 'Unable to load leases.' }
  }

  const leaseIds = leases.map((lease) => lease.id)

  let documents: LeaseDocumentRow[] = []
  if (leaseIds.length) {
    const { data: leaseDocuments, error: documentsError } = await supabase
      .from('lease_documents')
      .select('*')
      .in('lease_id', leaseIds)
      .order('version', { ascending: false })

    if (documentsError) {
      return { data: [], error: documentsError.message }
    }

    documents = leaseDocuments ?? []
  }

  const documentsByLease = new Map<string, LeaseDocumentWithUrl[]>()
  const documentsWithUrls = await withSignedUrls(supabase, documents)
  documentsWithUrls.forEach((doc) => {
    const list = documentsByLease.get(doc.lease_id) ?? []
    list.push(doc)
    documentsByLease.set(doc.lease_id, list)
  })

  const tenantIds = leases.map((lease) => lease.tenant_profile_id)
  const uniqueTenantIds = Array.from(new Set(tenantIds))

  let tenantProfiles: ProfileRow[] = []
  if (uniqueTenantIds.length) {
    const { data: tenants, error: tenantsError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', uniqueTenantIds)

    if (!tenantsError && tenants) {
      tenantProfiles = tenants
    }
  }

  const tenantById = new Map<string, ProfileRow>()
  tenantProfiles.forEach((tenant) => tenantById.set(tenant.id, tenant))

  const data: LeaseOverviewEntry[] = leases.map((lease) => ({
    lease,
    tenant: tenantById.get(lease.tenant_profile_id) ?? null,
    documents: documentsByLease.get(lease.id) ?? [],
  }))

  return { data }
}

export async function listTenantLeaseDocuments(): Promise<TenantLeaseDocumentsResult> {
  const supabase = await getSupabaseClient()
  const { profile, error: authError } = await fetchCurrentProfile(supabase)

  if (authError || !profile) {
    return {
      data: [],
      error: authError ?? 'You must be signed in to view lease documents.',
      unauthorized: true,
      requiresAuth: true,
    }
  }

  const { data: documents, error: documentsError } = await supabase
    .from('lease_documents')
    .select('*')
    .order('effective_date', { ascending: false })

  if (documentsError) {
    return { data: [], error: documentsError.message }
  }

  const docList = documents ?? []
  const leaseIds = Array.from(new Set(docList.map((doc) => doc.lease_id)))

  let leases: LeaseRow[] = []
  if (leaseIds.length) {
    const { data: leaseRows, error: leaseError } = await supabase
      .from('leases')
      .select('*')
      .in('id', leaseIds)

    if (leaseError) {
      return { data: [], error: leaseError.message }
    }

    leases = leaseRows ?? []
  }

  const leaseById = new Map<string, LeaseRow>()
  leases.forEach((lease) => leaseById.set(lease.id, lease))

  const documentsWithUrls = await withSignedUrls(supabase, docList)
  const data: TenantLeaseDocument[] = documentsWithUrls.map((doc) => ({
    ...doc,
    lease: leaseById.get(doc.lease_id) ?? null,
  }))

  return { data }
}
