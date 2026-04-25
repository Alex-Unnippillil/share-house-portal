import { writeAuditRecord } from '@/lib/audit'
import { jsonErrorFromUnknown } from '@/lib/errors'
import { requirePrivilegedApiAccess } from '@/lib/api-auth'
import { consumeRateLimit, createRateLimitResponse, getRateLimitKeyFromRequest } from '@/lib/rate-limit'

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`
  }

  return value
}

export async function GET(req: Request) {
  try {
    const authContext = await requirePrivilegedApiAccess()
    if (authContext instanceof Response) {
      return authContext
    }

    const { supabase, userId, role } = authContext

    const rateLimit = consumeRateLimit({
      bucket: 'api:payments:reconciliation:export',
      key: getRateLimitKeyFromRequest(req, `user:${userId}`),
      limit: 5,
      windowMs: 60_000,
    })

    if (!rateLimit.ok) {
      return createRateLimitResponse(rateLimit)
    }

    const { data, error } = await supabase
      .from('rent_payments')
      .select('id, amount, currency, status, description, processed_at, metadata, payer_name')
      .eq('status', 'failed')
      .order('processed_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    const { data: queuedEvents, error: queuedEventsError } = await supabase
      .from('webhook_events')
      .select('event_id, event_type, created_at, error_message, payload')
      .eq('provider', 'stripe')
      .eq('status', 'failed')
      .ilike('error_message', '%map%tenant%')
      .order('created_at', { ascending: false })

    if (queuedEventsError) {
      throw queuedEventsError
    }

    const header = [
      'payment_id',
      'tenant_name',
      'amount',
      'currency',
      'status',
      'description',
      'processed_at',
      'triage_status',
      'triage_notes',
    ]

    const paymentLines = (data ?? []).map((row) => {
      const metadata = (row.metadata ?? {}) as Record<string, unknown>
      return [
        row.id,
        row.payer_name ?? 'Unassigned tenant',
        row.amount.toString(),
        row.currency,
        row.status,
        row.description ?? '',
        row.processed_at ?? '',
        typeof metadata.triage_status === 'string' ? metadata.triage_status : 'open',
        typeof metadata.triage_notes === 'string' ? metadata.triage_notes : '',
      ]
        .map((value) => escapeCsv(value))
        .join(',')
    })

    const queuedEventLines = (queuedEvents ?? []).map((event) => {
      const payload = (event.payload ?? {}) as Record<string, unknown>
      const reconciliation = (payload.reconciliation ?? {}) as Record<string, unknown>

      return [
        event.event_id,
        'Unmapped Stripe event',
        '0',
        'USD',
        'unmapped',
        event.event_type,
        event.created_at ?? '',
        typeof reconciliation.triage_status === 'string' ? reconciliation.triage_status : 'open',
        typeof reconciliation.triage_notes === 'string'
          ? reconciliation.triage_notes
          : (event.error_message ?? ''),
      ]
        .map((value) => escapeCsv(value))
        .join(',')
    })

    const csv = [header.join(','), ...queuedEventLines, ...paymentLines].join('\n')
    const exportedAt = new Date().toISOString()

    await writeAuditRecord({
      action: 'payments.reconciliation.export',
      actorId: userId,
      actorRole: role,
      targetType: 'reconciliation_export',
      metadata: {
        scope: 'payments.reconciliation',
        rowCount: queuedEventLines.length + paymentLines.length,
        exportedAt,
      },
    })

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="failed-payments-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (error) {
    return jsonErrorFromUnknown(error, 'DATA_FETCH_FAILED')
  }
}
