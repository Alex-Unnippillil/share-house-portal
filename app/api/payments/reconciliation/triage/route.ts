import { requirePrivilegedApiAccess } from '@/lib/api-auth'
import { jsonError, jsonErrorFromUnknown } from '@/lib/errors'
import { consumeRateLimit, createRateLimitResponse, getRateLimitKeyFromRequest } from '@/lib/rate-limit'

const allowedTriageStatus = new Set(['open', 'investigating', 'resolved'])

export async function PATCH(req: Request) {
  try {
    const authContext = await requirePrivilegedApiAccess()

    if (authContext instanceof Response) {
      return authContext
    }

    const { supabase, userId } = authContext

    const rateLimit = consumeRateLimit({
      bucket: 'api:payments:reconciliation:triage',
      key: getRateLimitKeyFromRequest(req, `user:${userId}`),
      limit: 20,
      windowMs: 60_000,
    })

    if (!rateLimit.ok) {
      return createRateLimitResponse(rateLimit)
    }

    const payload = await req.json().catch(() => null)
    const paymentId = typeof payload?.paymentId === 'string' ? payload.paymentId : null
    const recordType = payload?.recordType === 'webhook_event' ? 'webhook_event' : 'rent_payment'
    const triageStatus =
      typeof payload?.triageStatus === 'string' ? payload.triageStatus : 'open'
    const triageNotes =
      typeof payload?.triageNotes === 'string' ? payload.triageNotes.trim() : ''

    if (!paymentId || !allowedTriageStatus.has(triageStatus)) {
      return jsonError('REQUEST_VALIDATION_ERROR', {
        message: 'paymentId and a valid triageStatus are required.',
      })
    }

    if (recordType === 'webhook_event') {
      const { data: eventRow, error: eventError } = await supabase
        .from('webhook_events')
        .select('payload')
        .eq('provider', 'stripe')
        .eq('event_id', paymentId)
        .single()

      if (eventError) {
        throw eventError
      }

      const existingPayload = (eventRow.payload ?? {}) as Record<string, unknown>
      const existingReconciliation =
        (existingPayload.reconciliation ?? {}) as Record<string, unknown>

      const { error: updateError } = await supabase
        .from('webhook_events')
        .update({
          payload: {
            ...existingPayload,
            reconciliation: {
              ...existingReconciliation,
              triage_status: triageStatus,
              triage_notes: triageNotes,
              triage_updated_by: userId,
              triage_updated_at: new Date().toISOString(),
            },
          },
        })
        .eq('provider', 'stripe')
        .eq('event_id', paymentId)

      if (updateError) {
        throw updateError
      }

      return Response.json({ ok: true })
    }

    const { data: payment, error: paymentError } = await supabase
      .from('rent_payments')
      .select('metadata')
      .eq('id', paymentId)
      .single()

    if (paymentError) {
      throw paymentError
    }

    const nextMetadata = {
      ...((payment.metadata ?? {}) as Record<string, unknown>),
      triage_status: triageStatus,
      triage_notes: triageNotes,
      triage_updated_by: userId,
      triage_updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from('rent_payments')
      .update({ metadata: nextMetadata })
      .eq('id', paymentId)

    if (updateError) {
      throw updateError
    }

    return Response.json({ ok: true })
  } catch (error) {
    return jsonErrorFromUnknown(error, 'DATA_FETCH_FAILED')
  }
}
