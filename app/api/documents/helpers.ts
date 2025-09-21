import { cookies } from 'next/headers'
import type { TypedSupabaseClient } from '@/utils/typed-supabase-client'
import { createClient } from '@/utils/supa-server-actions'
import type { DocumentAuditEntry, DocumentCategory, DocumentRecord, DocumentVisibility } from '@/web/features/documents/types'
import { canEditDocument, canViewDocument, type DocumentPermissionModel, type DocumentUser } from '@/web/features/documents/utils'

export function createSupabaseRouteClient(): TypedSupabaseClient {
  const cookieStore = cookies()
  return createClient(cookieStore) as unknown as TypedSupabaseClient
}

type ProfileRow = {
  id: string
  role: string | null
  full_name: string | null
  email: string | null
}

type DocumentCategoryRow = {
  id: string
  name: string
  description: string | null
  visibility: DocumentVisibility
  allowed_roles: string[] | null
  created_at: string
  updated_at: string | null
}

type DocumentRow = {
  id: string
  name: string
  category_id: string
  storage_path: string
  file_size: number
  visibility: DocumentVisibility
  allowed_roles: string[] | null
  allowed_users: string[] | null
  uploaded_by: string
  created_at: string
  updated_at: string | null
  category?: DocumentCategoryRow | null
  uploader?: ProfileRow | null
}

type AuditRow = {
  id: string
  document_id: string
  action: DocumentAuditEntry['action']
  actor_id: string
  context: Record<string, unknown> | null
  created_at: string
  actor?: ProfileRow | null
}

export async function getCurrentUserWithProfile(client: TypedSupabaseClient) {
  const {
    data: { user },
    error,
  } = await client.auth.getUser()

  if (error || !user) {
    return { user: null, profile: null as ProfileRow | null, error }
  }

  const { data: profile } = await client
    .from('profiles')
    .select('id, role, full_name, email')
    .eq('id', user.id)
    .maybeSingle()

  return { user, profile: profile ?? null, error: null }
}

export function mapCategory(row: DocumentCategoryRow): DocumentCategory {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    visibility: row.visibility,
    allowedRoles: row.allowed_roles ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapDocument(row: DocumentRow): DocumentRecord {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    categoryName: row.category?.name ?? null,
    storagePath: row.storage_path,
    size: row.file_size,
    visibility: row.visibility,
    allowedRoles: row.allowed_roles ?? [],
    allowedUsers: row.allowed_users ?? [],
    uploadedBy: row.uploaded_by,
    uploadedByName: row.uploader?.full_name ?? null,
    uploadedByEmail: row.uploader?.email ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapAudit(row: AuditRow): DocumentAuditEntry {
  return {
    id: row.id,
    documentId: row.document_id,
    action: row.action,
    actorId: row.actor_id,
    actorName: row.actor?.full_name ?? null,
    actorEmail: row.actor?.email ?? null,
    context: row.context,
    createdAt: row.created_at,
  }
}

export function buildPermissionModel(row: DocumentRow): DocumentPermissionModel {
  return {
    ownerId: row.uploaded_by,
    visibility: row.visibility,
    allowedRoles: row.allowed_roles ?? [],
    allowedUsers: row.allowed_users ?? [],
  }
}

export function buildDocumentUser(user: ProfileRow | null, userId: string): DocumentUser {
  return {
    id: userId,
    role: (user?.role ?? 'user').toString(),
  }
}

export async function fetchDocument(client: TypedSupabaseClient, documentId: string) {
  const { data, error } = await client
    .from('documents')
    .select(
      `id, name, category_id, storage_path, file_size, visibility, allowed_roles, allowed_users, uploaded_by, created_at, updated_at,
      category:document_categories(id, name, description, visibility, allowed_roles, created_at, updated_at),
      uploader:profiles(id, full_name, email, role)`,
    )
    .eq('id', documentId)
    .maybeSingle()

  if (error || !data) {
    throw error ?? new Error('Document not found')
  }

  return data as DocumentRow
}

export async function ensureCanViewDocument(
  client: TypedSupabaseClient,
  documentId: string,
  user: { id: string; profile: ProfileRow | null },
) {
  const row = await fetchDocument(client, documentId)
  const permission = buildPermissionModel(row)
  const actor = buildDocumentUser(user.profile, user.id)

  if (!canViewDocument(actor, permission)) {
    throw new Error('You do not have permission to view this document')
  }

  return row
}

export async function ensureCanEditDocument(
  client: TypedSupabaseClient,
  documentId: string,
  user: { id: string; profile: ProfileRow | null },
) {
  const row = await fetchDocument(client, documentId)
  const permission = buildPermissionModel(row)
  const actor = buildDocumentUser(user.profile, user.id)

  if (!canEditDocument(actor, permission)) {
    throw new Error('You do not have permission to modify this document')
  }

  return row
}

export async function logDocumentAudit(
  client: TypedSupabaseClient,
  entry: {
    documentId: string
    actorId: string
    action: DocumentAuditEntry['action']
    context?: Record<string, unknown> | null
  },
) {
  const { error } = await client.from('document_audit_logs').insert({
    document_id: entry.documentId,
    actor_id: entry.actorId,
    action: entry.action,
    context: entry.context ?? null,
  })

  if (error) {
    throw error
  }
}
