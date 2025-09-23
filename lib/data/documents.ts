import type { TypedSupabaseClient } from '@/utils/typed-supabase-client';
import type {
  DocumentListFilters,
  DocumentListSort,
  DocumentStats,
  DocumentVersion,
  DocumentWithLease,
} from '@/types/documents';
import type { Database } from '@/lib/supabase';
import { convertRowsToCsv } from '@/lib/csv';
import {
  DOCUMENT_CSV_COLUMNS,
  type DocumentColumnId,
} from '@/lib/documents/csv-columns';

type SupabaseClientLike = Pick<TypedSupabaseClient, 'from'>;

type MemberRole = Database['public']['Tables']['profiles']['Row']['role'];

type FetchDocumentsParams = {
  client: SupabaseClientLike;
  userId: string;
  role: MemberRole | null | undefined;
  filters?: DocumentListFilters;
  sort?: DocumentListSort;
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
        access_logs:document_access_logs(*, profiles:signer_id(username, full_name)),
        versions:document_versions(
          id,
          document_id,
          version,
          state,
          status,
          snapshot,
          created_at,
          created_by,
          published_at
        )
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
  sort,
}: FetchDocumentsParams): Promise<DocumentWithLease[]> {
  const sortColumn = sort?.column ?? 'created_at';
  const ascending = sort?.direction === 'asc';

  let query = (client as any)
    .from('documents')
    .select(DOCUMENT_SELECT)
    .order(sortColumn, { ascending });

  if (sortColumn !== 'created_at') {
    query = query.order('created_at', { ascending: false });
  }

  if (role !== 'property_manager' && role !== 'admin') {
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

  const documents = (data ?? []) as (DocumentWithLease & {
    versions?: DocumentVersion[] | null;
  })[];

  return documents.map((document) => ({
    ...document,
    versions: (document.versions ?? [])
      .filter((version): version is DocumentVersion => Boolean(version))
      .slice()
      .sort((a, b) => b.version - a.version),
  }));
}

export async function exportDocumentsToCsv({
  client,
  userId,
  role,
  filters,
  sort,
  visibleColumns,
}: FetchDocumentsParams & { visibleColumns: DocumentColumnId[] }): Promise<{
  csv: string;
  documents: DocumentWithLease[];
}> {
  const documents = await fetchDocumentsList({
    client,
    userId,
    role,
    filters,
    sort,
  });

  const csv = convertRowsToCsv({
    rows: documents,
    columns: DOCUMENT_CSV_COLUMNS,
    visibleColumnIds: visibleColumns,
  });

  return { csv, documents };
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
