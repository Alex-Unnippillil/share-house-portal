import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { fetchMemberRole } from '@/lib/data/members';
import type { TypedSupabaseClient } from '@/utils/typed-supabase-client';

export async function GET(
  request: Request,
  { params }: { params: { documentId: string } }
) {
  const supabase = createClient();
  const typedSupabase = supabase as unknown as TypedSupabaseClient;
  const action = new URL(request.url).searchParams.get('action') === 'download' ? 'download' : 'view';

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = await fetchMemberRole(typedSupabase, user.id);

  let query = supabase
    .from('documents')
    .select('id, file_url, tenant_id, created_by, metadata')
    .eq('id', params.documentId);

  if (role !== 'property_manager' && role !== 'admin') {
    query = query.or(`tenant_id.eq.${user.id},created_by.eq.${user.id}`);
  }

  const { data: document, error: documentError } = await query.single();

  if (documentError || !document?.file_url) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const metadata = (document.metadata ?? {}) as Record<string, unknown>;
  const storagePath =
    typeof metadata.storage_path === 'string' && metadata.storage_path.length > 0
      ? metadata.storage_path
      : document.file_url;

  const { data: signed, error: signedError } = await supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, 60 * 10, {
      download: action === 'download' ? true : undefined,
    });

  if (signedError || !signed?.signedUrl) {
    return NextResponse.json({ error: 'Unable to create secure URL' }, { status: 500 });
  }

  await supabase.rpc('log_document_access', {
    p_document_id: params.documentId,
    p_action: action,
    p_metadata: { source: 'documents_access_endpoint' },
  });

  await (supabase as any).from('audit_logs').insert({
    actor_id: user.id,
    entity_type: 'document',
    entity_id: params.documentId,
    action: action === 'download' ? 'document.downloaded' : 'document.viewed',
    metadata: { source: 'documents_access_endpoint' },
  });

  return NextResponse.redirect(signed.signedUrl, { status: 307 });
}
