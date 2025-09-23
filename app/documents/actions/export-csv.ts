'use server';

import { cookies } from 'next/headers';

import { buildCsvStream } from '@/lib/export/csv';
import { DOCUMENT_CSV_HEADERS, buildDocumentCsvRows } from '@/lib/export/documents';
import { fetchDocumentsList } from '@/lib/data/documents';
import { fetchMemberRole } from '@/lib/data/members';
import type { TypedSupabaseClient } from '@/utils/typed-supabase-client';
import { createClient } from '@/utils/supa-server-actions';
import type { DocumentListFilters } from '@/types/documents';

import { documentListFiltersSchema } from './index';

export async function exportDocumentsCsv(
  filters: DocumentListFilters = {}
): Promise<ReadableStream<Uint8Array>> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const typedSupabase = supabase as unknown as TypedSupabaseClient;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be logged in to export documents.');
  }

  const validatedFilters = documentListFiltersSchema.parse(filters ?? {});

  let role: Awaited<ReturnType<typeof fetchMemberRole>>;
  try {
    role = await fetchMemberRole(typedSupabase, user.id);
  } catch (error) {
    throw new Error('Unable to resolve your document permissions.');
  }

  const documents = await fetchDocumentsList({
    client: typedSupabase,
    userId: user.id,
    role,
    filters: validatedFilters,
  });

  const rows = buildDocumentCsvRows(documents);
  return buildCsvStream(DOCUMENT_CSV_HEADERS, rows);
}
