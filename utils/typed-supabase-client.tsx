import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database, Json } from '@/lib/supabase'

export type TypedSupabaseClient = SupabaseClient<Database, 'public'>

export const PRIVILEGED_ROLES = ['property_manager', 'admin'] as const
export type PrivilegedRole = (typeof PRIVILEGED_ROLES)[number]

export function isPrivilegedRole(role: Database['public']['Tables']['profiles']['Row']['role'] | null): role is PrivilegedRole {
  return role === 'property_manager' || role === 'admin'
}

export const DOCUMENT_AUDIT_ACTIONS = {
  uploaded: 'document.uploaded',
  viewed: 'document.viewed',
  downloaded: 'document.downloaded',
} as const

export type DocumentAuditAction = (typeof DOCUMENT_AUDIT_ACTIONS)[keyof typeof DOCUMENT_AUDIT_ACTIONS]

export function documentsTable(client: TypedSupabaseClient) {
  return client.from('documents')
}

export function auditLogsTable(client: TypedSupabaseClient) {
  return client.from('audit_logs')
}

export type DocumentAccessAction = 'view' | 'download' | 'upload' | 'signing_request_created' | 'signed'

export function logDocumentAccess(
  client: TypedSupabaseClient,
  args: {
    documentId: string
    action: DocumentAccessAction
    metadata?: Record<string, unknown>
  }
) {
  const rpcClient = client as unknown as {
    rpc: (fn: string, params: Record<string, Json>) => Promise<unknown>
  }

  return rpcClient.rpc('log_document_access', {
    p_document_id: args.documentId,
    p_action: args.action,
    p_metadata: (args.metadata ?? {}) as Json,
  })
}
