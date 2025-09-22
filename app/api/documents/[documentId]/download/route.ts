import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Buffer } from 'node:buffer';

import { decryptBuffer } from '@/lib/encryption';
import { createClient } from '@/utils/supa-server-actions';

function extractClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const [first] = forwardedFor.split(',');
    if (first) return first.trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  return request.ip ?? null;
}

export async function GET(request: NextRequest, { params }: { params: { documentId: string } }) {
  const { documentId } = params;

  if (!documentId) {
    return NextResponse.json({ error: 'Document id is required.' }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data: document, error: documentError } = await (supabase as any)
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (documentError || !document) {
    return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
  }

  if (!document.storage_path || !document.encryption_iv || !document.encryption_tag) {
    return NextResponse.json({ error: 'Document file is unavailable.' }, { status: 422 });
  }

  const { data: downloadData, error: downloadError } = await supabase.storage
    .from('documents')
    .download(document.storage_path);

  if (downloadError || !downloadData) {
    return NextResponse.json({ error: 'Failed to retrieve document file.' }, { status: 500 });
  }

  const encryptedBuffer = Buffer.from(await downloadData.arrayBuffer());
  let decryptedBuffer: Buffer;
  try {
    decryptedBuffer = decryptBuffer({
      cipherText: encryptedBuffer,
      iv: document.encryption_iv,
      authTag: document.encryption_tag,
      algorithm: document.encryption_algorithm,
    });
  } catch (error) {
    console.error('Failed to decrypt document:', error);
    return NextResponse.json({ error: 'Failed to decrypt document.' }, { status: 500 });
  }

  const metadata = (document.metadata || {}) as Record<string, any>;
  const fileMetadata = (metadata.file || {}) as Record<string, any>;
  const fileName = (fileMetadata.originalName as string) || `${document.title}.pdf`;
  const mimeType = (fileMetadata.mimeType as string) || 'application/octet-stream';

  const mode = request.nextUrl.searchParams.has('download') ? 'download' : 'view';
  const disposition = mode === 'download' ? 'attachment' : 'inline';

  const response = new NextResponse(decryptedBuffer, {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `${disposition}; filename="${encodeURIComponent(fileName)}"`,
      'Cache-Control': 'no-store',
    },
  });

  const clientIp = extractClientIp(request);
  const userAgent = request.headers.get('user-agent');

  try {
    await (supabase as any).rpc('log_document_access', {
      p_document_id: document.id,
      p_action: mode === 'download' ? 'download' : 'view',
      p_metadata: {
        mode,
        storage_path: document.storage_path,
        mime_type: mimeType,
      },
      p_ip_address: clientIp,
      p_user_agent: userAgent,
    });
  } catch (error) {
    console.error('Failed to log document access:', error);
  }

  return response;
}
