import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import type { Database } from '@/lib/supabase'
import { createClient } from '@/utils/supa-server-actions'

import BillingClient from './billing-client'

type Member = Database['public']['Tables']['members']['Row']
type LedgerEntry = Database['public']['Tables']['rent_ledger_entries']['Row']

export default async function BillingSettingsPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/auth')
  }

  const { data: memberRecord, error: memberError } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (memberError) {
    throw new Error(memberError.message)
  }

  let member: Member | null = memberRecord ?? null

  if (!member) {
    const { data: insertedMember, error: insertError } = await supabase
      .from('members')
      .insert({ user_id: user.id })
      .select()
      .single()

    if (insertError) {
      throw new Error(insertError.message)
    }

    member = insertedMember
  }

  const { data: ledgerEntries, error: ledgerError } = await supabase
    .from('rent_ledger_entries')
    .select('*')
    .eq('member_id', member.id)
    .order('due_date', { ascending: true })

  if (ledgerError) {
    throw new Error(ledgerError.message)
  }

  const ledgerList: LedgerEntry[] = ledgerEntries ?? []

  return (
    <div className="container max-w-5xl space-y-8 py-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Billing &amp; Auto-Pay</h1>
        <p className="text-muted-foreground">
          Manage your pre-authorized debit (PAD) enrollment, review rent ledger activity, and keep auto-pay preferences current.
        </p>
      </div>
      <BillingClient member={member} ledgerEntries={ledgerList} userEmail={user.email ?? null} />
    </div>
  )
}
