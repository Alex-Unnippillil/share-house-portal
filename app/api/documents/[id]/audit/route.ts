import { NextResponse } from 'next/server'
import {
  createSupabaseRouteClient,
  ensureCanViewDocument,
  getCurrentUserWithProfile,
  mapAudit,
} from '../../helpers'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createSupabaseRouteClient()
  const { user, profile, error } = await getCurrentUserWithProfile(supabase)

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await ensureCanViewDocument(supabase, params.id, { id: user.id, profile })
  } catch (permissionError) {
    return NextResponse.json({ error: (permissionError as Error).message }, { status: 403 })
  }

  const { data, error: auditError } = await supabase
    .from('document_audit_logs')
    .select('id, document_id, action, actor_id, context, created_at, actor:profiles(id, full_name, email)')
    .eq('document_id', params.id)
    .order('created_at', { ascending: false })

  if (auditError) {
    return NextResponse.json({ error: auditError.message }, { status: 500 })
  }

  return NextResponse.json({ entries: (data ?? []).map(mapAudit) })
}
