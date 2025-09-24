import { redirect } from 'next/navigation'

import { DnsHelp } from './components/DnsHelp'
import { DomainOnboardingForm } from './components/DomainOnboardingForm'
import { DomainOverview } from './components/DomainOverview'
import { loadDomainManagementData } from '@/lib/data/domains'
import { createSupbaseServerClient } from '@/utils/supaone'
import type { TypedSupabaseClient } from '@/utils/typed-supabase-client'

const AUTHORIZED_ROLES = new Set(['property_manager', 'admin', 'landlord'])

export default async function DomainsPage() {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throw new Error(error.message)
  }

  if (!user) {
    redirect('/auth')
  }

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  const role = profile?.role ?? null

  if (!role || !AUTHORIZED_ROLES.has(role)) {
    return (
      <section className="space-y-3">
        <h1 className="text-3xl font-bold">Custom domains</h1>
        <p className="text-muted-foreground">
          Only admins and property managers can manage DNS onboarding and certificate renewals.
        </p>
      </section>
    )
  }

  const typedClient = supabase as unknown as Pick<TypedSupabaseClient, 'from'>
  const { domains } = await loadDomainManagementData(typedClient)

  const defaultProjectId =
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_ID ?? process.env.VERCEL_PROJECT_ID ?? null

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold">Custom domains</h1>
        <p className="text-muted-foreground">
          Connect branded URLs to the Roomsily dashboard and automate certificate renewals for tenants.
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <DomainOnboardingForm defaultProjectId={defaultProjectId} />
        <DnsHelp />
      </div>
      <DomainOverview domains={domains} />
    </div>
  )
}
