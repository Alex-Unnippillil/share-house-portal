import { cookies } from 'next/headers'
import { SupabaseClient } from '@supabase/supabase-js'
import useSupabaseServer from '@/utils/supabase-server'
import {
  buildLedgerSummaries,
  LedgerInvoice,
  LedgerMember,
  LedgerPadMandate,
  LedgerPayment,
} from './ledger-utils'
import { LedgerMemberSection } from './ledger-member-section'

type LedgerQueryResult = {
  summaries: ReturnType<typeof buildLedgerSummaries>
  errors: string[]
}

type AnySupabaseClient = SupabaseClient<any, any, any>

async function fetchLedger(): Promise<LedgerQueryResult> {
  const cookieStore = cookies()
  const supabase = (await useSupabaseServer(cookieStore)) as AnySupabaseClient

  const [invoicesRes, paymentsRes, mandatesRes, membersRes] = await Promise.all([
    supabase
      .from('billing_invoices')
      .select('id, member_id, amount_due, due_date, status, description, late_fee_per_day')
      .returns<LedgerInvoice[]>(),
    supabase
      .from('billing_payments')
      .select('id, member_id, invoice_id, amount, created_at, method, status')
      .order('created_at', { ascending: false })
      .returns<LedgerPayment[]>(),
    supabase
      .from('pad_mandates')
      .select('id, member_id, status, bank_name, account_last4, last_confirmed_at')
      .returns<LedgerPadMandate[]>(),
    supabase
      .from('profiles')
      .select('id, full_name, email')
      .returns<LedgerMember[]>(),
  ])

  const errors = [invoicesRes.error, paymentsRes.error, mandatesRes.error, membersRes.error]
    .filter(Boolean)
    .map(error => error!.message)

  const summaries = buildLedgerSummaries({
    members: membersRes.data ?? [],
    invoices: invoicesRes.data ?? [],
    payments: paymentsRes.data ?? [],
    padMandates: mandatesRes.data ?? [],
  })

  return { summaries, errors }
}

export default async function LedgerPage() {
  const { summaries, errors } = await fetchLedger()

  return (
    <main className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Member ledger</h1>
        <p className="text-sm text-slate-600">
          Track invoices, payments, and PAD mandate status for every roommate to keep monthly rent
          collection transparent.
        </p>
      </div>

      {errors.length > 0 && (
        <div
          role="alert"
          className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <p className="font-medium">Some billing data could not be loaded.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errors.map(message => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      {summaries.length === 0 ? (
        <p className="text-sm text-slate-600">No billing records found for this household.</p>
      ) : (
        <div className="space-y-6">
          {summaries.map(summary => (
            <LedgerMemberSection key={summary.member.id} summary={summary} />
          ))}
        </div>
      )}
    </main>
  )
}

export { fetchLedger }
