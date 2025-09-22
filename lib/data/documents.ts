import type { TypedSupabaseClient } from '@/utils/typed-supabase-client';
import type { DocumentListFilters, DocumentStats, DocumentWithLease } from '@/types/documents';
import type { MemberRole } from '@/lib/members';
import { isManagementRole } from '@/lib/members';

type SupabaseClientLike = Pick<TypedSupabaseClient, 'from'>;

type FetchDocumentsParams = {
  client: SupabaseClientLike;
  userId: string;
  role: MemberRole | null | undefined;
  filters?: DocumentListFilters;
};

type FetchDocumentStatsParams = {
  client: SupabaseClientLike;
  userId: string;
  role: MemberRole | null | undefined;
};

const DOCUMENT_SELECT = `
        *,
        lease:leases(*),
        signatures:document_signatures(*),
        access_logs:document_access_logs(*, profiles:signer_id(username, full_name))
      `;

function handlePostgrestError(error: { message: string } | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

export async function fetchDocumentsList({
  client,
  userId,
  role,
  filters = {},
}: FetchDocumentsParams): Promise<DocumentWithLease[]> {
  let query = (client as any)
    .from('documents')
    .select(DOCUMENT_SELECT)
    .order('created_at', { ascending: false });

  if (!isManagementRole(role)) {
    query = query.or(`tenant_id.eq.${userId},signatures.signer_id.eq.${userId}`);
  }

  if (filters.status?.length) {
    query = query.in('status', filters.status);
  }

  if (filters.type?.length) {
    query = query.in('document_type', filters.type);
  }

  if (filters.tenant_id) {
    query = query.eq('tenant_id', filters.tenant_id);
  }

  if (filters.unit_id) {
    query = query.eq('unit_id', filters.unit_id);
  }

  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from);
  }

  if (filters.date_to) {
    query = query.lte('created_at', filters.date_to);
  }

  const { data, error } = await query;
  handlePostgrestError(error, 'Failed to fetch documents');

  return data ?? [];
}

export async function fetchDocumentStats({
  client,
  userId,
  role,
}: FetchDocumentStatsParams): Promise<DocumentStats> {
  let query = client.from('documents').select('status');

  if (!isManagementRole(role)) {
    query = query.eq('tenant_id', userId);
  }

  const { data, error } = await query;
  handlePostgrestError(error, 'Failed to fetch document statistics');

  const documents = (data ?? []) as { status: string | null }[];

  return {
    total_documents: documents.length,
    pending_signatures: documents.filter(d => d.status === 'pending_signature').length,
    signed_documents: documents.filter(d => d.status === 'signed').length,
    expired_documents: documents.filter(d => d.status === 'expired').length,
    draft_documents: documents.filter(d => d.status === 'draft').length,
  };
}
