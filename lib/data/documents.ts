import type { TypedSupabaseClient } from '@/utils/typed-supabase-client';
import type {
  DocumentListFilters,
  DocumentSavedView,
  DocumentStats,
  DocumentVersion,
  DocumentWithLease,
} from '@/types/documents';
import type { Database } from '@/lib/supabase';
import {
  cleanDocumentFilters,
  normalizeDocumentFilters,
} from '@/lib/documents-filters';

type SupabaseClientLike = Pick<TypedSupabaseClient, 'from'>;

type MemberRole = Database['public']['Tables']['profiles']['Row']['role'];

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
}: FetchDocumentsParams): Promise<DocumentWithLease[]> {
  const normalizedFilters = normalizeDocumentFilters(filters);
  let query = (client as any)
    .from('documents')
    .select(DOCUMENT_SELECT)
    .order('created_at', { ascending: false });

  if (role !== 'property_manager' && role !== 'admin') {
    query = query.or(`tenant_id.eq.${userId},signatures.signer_id.eq.${userId}`);
  }

  if (normalizedFilters.status?.length) {
    query = query.in('status', normalizedFilters.status);
  }

  if (normalizedFilters.type?.length) {
    query = query.in('document_type', normalizedFilters.type);
  }

  if (normalizedFilters.tenant_id) {
    query = query.eq('tenant_id', normalizedFilters.tenant_id);
  }

  if (normalizedFilters.unit_id) {
    query = query.eq('unit_id', normalizedFilters.unit_id);
  }

  if (normalizedFilters.date_from) {
    query = query.gte('created_at', normalizedFilters.date_from);
  }

  if (normalizedFilters.date_to) {
    query = query.lte('created_at', normalizedFilters.date_to);
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

type FetchDocumentSavedViewsParams = {
  client: SupabaseClientLike;
  userId: string;
};

type UpsertDocumentSavedViewParams = {
  client: SupabaseClientLike;
  userId: string;
  view: {
    id?: string;
    name: string;
    filters: DocumentListFilters;
  };
};

export async function fetchDocumentSavedViews({
  client,
  userId,
}: FetchDocumentSavedViewsParams): Promise<DocumentSavedView[]> {
  const { data, error } = await (client as any)
    .from('document_saved_views')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  handlePostgrestError(error, 'Failed to fetch document saved views');

  return ((data ?? []) as DocumentSavedView[]).map((view) => ({
    ...view,
    filters: cleanDocumentFilters(view.filters as DocumentListFilters),
  }));
}

export async function upsertDocumentSavedView({
  client,
  userId,
  view,
}: UpsertDocumentSavedViewParams): Promise<DocumentSavedView> {
  const payload: Record<string, unknown> = {
    user_id: userId,
    name: view.name,
    filters: cleanDocumentFilters(view.filters),
  };

  if (view.id) {
    payload.id = view.id;
  }

  const { data, error } = await (client as any)
    .from('document_saved_views')
    .upsert(payload, {
      onConflict: 'user_id,name',
      ignoreDuplicates: false,
    })
    .select('*')
    .single();

  handlePostgrestError(error, 'Failed to save document view');

  const savedView = data as DocumentSavedView;

  return {
    ...savedView,
    filters: cleanDocumentFilters(savedView.filters as DocumentListFilters),
  };
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
