import { NextResponse } from 'next/server'

import type { Database } from '@/lib/supabase'
import { getStripeClient } from '@/lib/stripe'
import { getServiceRoleSupabase } from '@/utils/supabase-service-role'

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

type LedgerEntryRow = Database['public']['Tables']['rent_ledger_entries']['Row']
type MemberRow = Database['public']['Tables']['members']['Row']

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret) {
    const provided = request.headers.get('authorization')
    if (provided !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const stripe = getStripeClient()
  const supabase = getServiceRoleSupabase()

  const batchSize = Number.parseInt(process.env.BILLING_AUTOPAY_BATCH_SIZE ?? '25', 10)
  const limit = Number.isNaN(batchSize) ? 25 : Math.max(1, Math.min(batchSize, 100))

  const todayIso = new Date().toISOString().slice(0, 10)

  const { data: entries, error: fetchError } = await supabase
    .from('rent_ledger_entries')
    .select(
      `
        id,
        amount,
        currency,
        due_date,
        status,
        payment_intent_id,
        failure_reason,
        member_id,
        member:members!inner (
          id,
          user_id,
          stripe_customer_id,
          pad_status,
          auto_pay_enabled,
          pad_mandate_id,
          pad_payment_method_id,
          pad_last_error
        )
      `,
    )
    .eq('status', 'pending')
    .lte('due_date', todayIso)
    .order('due_date', { ascending: true })
    .limit(limit)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const summary = {
    totalCandidates: entries?.length ?? 0,
    attempts: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
  }

  const processedIds: string[] = []
  const failures: { entryId: string; reason: string }[] = []

  const typedEntries = (entries ?? []) as (LedgerEntryRow & { member: MemberRow })[]

  if (typedEntries.length === 0) {
    return NextResponse.json({ summary, processedIds, failures })
  }

  for (const entry of typedEntries) {
    const member = entry.member

    if (!member || !member.auto_pay_enabled || member.pad_status !== 'active') {
      summary.skipped += 1
      continue
    }

    if (!member.stripe_customer_id || !member.pad_payment_method_id) {
      summary.skipped += 1
      continue
    }

    summary.attempts += 1

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: entry.amount,
        currency: entry.currency,
        customer: member.stripe_customer_id,
        payment_method: member.pad_payment_method_id,
        mandate: member.pad_mandate_id ?? undefined,
        confirm: true,
        off_session: true,
        description: `Rent due ${entry.due_date}`,
        payment_method_options: {
          acss_debit: {
            mandate_options: {
              payment_schedule: 'sporadic',
              transaction_type: 'personal',
            },
          },
        },
        metadata: {
          rent_ledger_entry_id: entry.id,
          supabase_member_id: entry.member_id,
        },
      })

      let ledgerStatus: 'processing' | 'paid' | 'failed' = 'processing'
      let failureReason: string | null = null

      if (paymentIntent.status === 'succeeded') {
        ledgerStatus = 'paid'
      } else if (
        paymentIntent.status === 'requires_payment_method' ||
        paymentIntent.status === 'canceled'
      ) {
        ledgerStatus = 'failed'
        failureReason =
          paymentIntent.last_payment_error?.message ??
          `Payment intent requires attention (${paymentIntent.status}).`
      } else {
        ledgerStatus = 'processing'
      }

      const nowIso = new Date().toISOString()

      const { error: updateError } = await supabase
        .from('rent_ledger_entries')
        .update({
          status: ledgerStatus,
          payment_intent_id: paymentIntent.id,
          failure_reason: failureReason,
          processed_at: nowIso,
          updated_at: nowIso,
          mandate_id: member.pad_mandate_id,
        })
        .eq('id', entry.id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      processedIds.push(entry.id)

      if (ledgerStatus === 'failed') {
        summary.failed += 1
        failures.push({ entryId: entry.id, reason: failureReason ?? 'Payment failed' })

        await supabase
          .from('members')
          .update({
            pad_status: 'action_required',
            pad_last_error: failureReason ?? 'Payment failed',
            auto_pay_enabled: false,
            updated_at: nowIso,
          })
          .eq('id', entry.member_id)
      } else {
        summary.succeeded += 1
      }
    } catch (error) {
      summary.failed += 1

      const message = getErrorMessage(error)
      const nowIso = new Date().toISOString()

      failures.push({ entryId: entry.id, reason: message })

      await supabase
        .from('rent_ledger_entries')
        .update({
          status: 'failed',
          failure_reason: message,
          updated_at: nowIso,
        })
        .eq('id', entry.id)

      await supabase
        .from('members')
        .update({
          pad_status: 'action_required',
          pad_last_error: message,
          auto_pay_enabled: false,
          updated_at: nowIso,
        })
        .eq('id', entry.member_id)
    }
  }

  return NextResponse.json({
    summary,
    processedIds,
    failures,
  })
}
