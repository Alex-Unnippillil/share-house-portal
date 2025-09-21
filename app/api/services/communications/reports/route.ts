import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supa-server-actions'
import {
  buildCommunicationsReport,
  getRequestContext,
  normalizeError,
} from '@/services/communications'

function toErrorResponse(error: unknown) {
  const normalized = normalizeError(error)

  return NextResponse.json(
    { error: normalized.message, details: normalized.details },
    { status: normalized.status },
  )
}

export async function GET() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  try {
    const context = await getRequestContext(supabase)
    const report = await buildCommunicationsReport(supabase, context)

    return NextResponse.json({ data: report })
  } catch (error) {
    return toErrorResponse(error)
  }
}
