import type { TypedSupabaseClient } from '@/utils/typed-supabase-client';
import type { DocumentListFilters, DocumentStats, DocumentWithLease } from '@/types/documents';
import type { Database } from '@/lib/supabase';

type SupabaseClientLike = Pick<TypedSupabaseClient, 'from'>;

type MemberRole = Database['public']['Tables']['profiles']['Row']['role'];

type FetchDocumentsParams = {
  client: SupabaseClientLike;
  userId: string;
  role: MemberRole | null | undefined;
  userUnitId?: string | null;
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
  userUnitId,
  filters = {},
}: FetchDocumentsParams): Promise<DocumentWithLease[]> {
  let query = (client as any)
    .from('documents')
    .select(DOCUMENT_SELECT)
    .order('created_at', { ascending: false });

  if (role !== 'property_manager' && role !== 'admin') {
    const escapeValue = (value: string) => value.replace(/"/g, '\\"');
    const orFilters = [
      `tenant_id.eq.${userId}`,
      `signatures.signer_id.eq.${userId}`,
      `metadata->shared_member_ids.cs.{"${escapeValue(userId)}"}`,
    ];

    if (role) {
      orFilters.push(`metadata->shared_roles.cs.{"${escapeValue(role)}"}`);
    }

    if (userUnitId) {
      orFilters.push(`metadata->shared_unit_ids.cs.{"${escapeValue(userUnitId)}"}`);
    }

    query = query.or(orFilters.join(','));
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

  if (role !== 'property_manager' && role !== 'admin') {
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
