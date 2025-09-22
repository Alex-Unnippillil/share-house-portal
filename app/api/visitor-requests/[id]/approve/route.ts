import { approveVisitorRequest } from '@/lib/visitor-requests'
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
    const { bookingId } = await approveVisitorRequest(supabase, params.id)
    return Response.json({ bookingId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error approving visitor request.'
    return Response.json({ error: message }, { status: 500 })
  }
}
