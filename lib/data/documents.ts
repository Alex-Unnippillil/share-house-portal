import type { TypedSupabaseClient } from '@/utils/typed-supabase-client';
import type { DocumentListFilters, DocumentStats, DocumentWithLease } from '@/types/documents';
import type { Database } from '@/lib/supabase';
import {
  normalizeDocumentFilters,
  isDocumentFilterEmpty,
} from '@/lib/document-filter-params';

type SupabaseClientLike = Pick<TypedSupabaseClient, 'from'>;

type MemberRole = Database['public']['Tables']['profiles']['Row']['role'];

type SavedViewRow = Database['public']['Tables']['saved_views']['Row'];

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

export interface SavedDocumentView {
  id: string;
  slug: string;
  name: string;
  resource: string;
  created_by: string;
  created_at: string | null;
  filters: DocumentListFilters;
}

function mapSavedViewRow(row: SavedViewRow): SavedDocumentView {
  const rawFilters = (row.filters ?? {}) as DocumentListFilters | Record<string, unknown>;
  const normalizedFilters = normalizeDocumentFilters(rawFilters as DocumentListFilters);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    resource: row.resource,
    created_by: row.created_by,
    created_at: row.created_at,
    filters: normalizedFilters,
  };
}

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateSavedViewSlug(name: string): string {
  const base = slugifyName(name) || 'view';
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

function serializeFilters(filters: DocumentListFilters) {
  const normalized = normalizeDocumentFilters(filters);
  if (isDocumentFilterEmpty(normalized)) {
    return {};
  }

  return JSON.parse(JSON.stringify(normalized));
}

interface FetchSavedDocumentViewBySlugParams {
  client: SupabaseClientLike;
  slug: string;
}

export async function fetchSavedDocumentViewBySlug({
  client,
  slug,
}: FetchSavedDocumentViewBySlugParams): Promise<SavedDocumentView | null> {
  const { data, error } = await (client as any)
    .from('saved_views')
    .select('id, slug, name, resource, created_by, created_at, filters')
    .eq('slug', slug)
    .eq('resource', 'documents')
    .maybeSingle();

  handlePostgrestError(error, 'Failed to load saved view');

  if (!data) {
    return null;
  }

  return mapSavedViewRow(data as SavedViewRow);
}

interface SaveDocumentViewParams {
  client: SupabaseClientLike;
  userId: string;
  name: string;
  filters: DocumentListFilters;
}

export async function saveDocumentView({
  client,
  userId,
  name,
  filters,
}: SaveDocumentViewParams): Promise<SavedDocumentView> {
  const payloadFilters = serializeFilters(filters);

  let attempt = 0;
  while (attempt < 3) {
    const slug = generateSavedViewSlug(name);

    const { data, error } = await (client as any)
      .from('saved_views')
      .insert({
        slug,
        name,
        resource: 'documents',
        created_by: userId,
        filters: payloadFilters,
      })
      .select('id, slug, name, resource, created_by, created_at, filters')
      .single();

    if (error) {
      const isDuplicate = typeof error.message === 'string' && error.message.toLowerCase().includes('duplicate key');
      if (isDuplicate) {
        attempt += 1;
        continue;
      }
      handlePostgrestError(error, 'Failed to save document view');
    }

    if (!data) {
      throw new Error('Failed to save document view');
    }

    return mapSavedViewRow(data as SavedViewRow);
  }

  throw new Error('Failed to save document view: could not generate unique slug');
}
