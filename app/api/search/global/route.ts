import { NextResponse } from 'next/server'

import { writeAuditRecord } from '@/lib/audit'
import { fetchMemberRole } from '@/lib/data/members'
import { getGlobalSearchResults } from '@/lib/operations/data'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const role = await fetchMemberRole(supabase as any, user.id)
  if (role !== 'property_manager' && role !== 'admin') return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

  const query = new URL(request.url).searchParams.get('q') ?? ''
  const results = await getGlobalSearchResults(query)

  await writeAuditRecord({
    action: 'operations.search.query',
    actorId: user.id,
    actorRole: role,
    targetType: 'global_search_api',
    metadata: { query, resultCount: Object.values(results).reduce((acc, value) => acc + value.length, 0) },
  })

  return NextResponse.json({ query, results })
}
