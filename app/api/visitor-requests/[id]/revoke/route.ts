import { revokeVisitorRequest } from '@/lib/visitor-requests'
import { createClient } from '@/utils/supabase/server'

interface RouteParams {
  params: { id: string }
}

export async function POST(_request: Request, { params }: RouteParams) {
  if (!params?.id) {
    return Response.json({ error: 'Visitor request id is required.' }, { status: 400 })
  }

  const supabase = createClient()

  try {
    const { cancelledBookingId } = await revokeVisitorRequest(supabase, params.id)
    return Response.json({ cancelledBookingId: cancelledBookingId ?? null })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error revoking visitor request.'
    return Response.json({ error: message }, { status: 500 })
  }
}
