import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supa-server-actions'

import PrivacyDashboard from './privacy-dashboard'
import type { PrivacyDashboardSummary } from './types'

type SummaryFunctionResponse = {
  latest_export?: {
    status?: string | null
    requested_at?: string | null
    completed_at?: string | null
    download_url?: string | null
  } | null
  pending_deletion?: {
    status?: string | null
    scheduled_for?: string | null
  } | null
}

async function loadPrivacyDashboardSummary(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<PrivacyDashboardSummary> {
  try {
    const { data, error } = await supabase.functions.invoke<SummaryFunctionResponse>(
      'privacy-dashboard-summary',
      {
        body: { user_id: userId },
      },
    )

    if (error || !data) {
      return { latestExport: null, pendingDeletion: null }
    }

    const latestRaw = data.latest_export ?? null
    const pendingRaw = data.pending_deletion ?? null

    return {
      latestExport: latestRaw
        ? {
            status: typeof latestRaw.status === 'string' ? latestRaw.status : 'pending',
            requestedAt: typeof latestRaw.requested_at === 'string' ? latestRaw.requested_at : null,
            completedAt: typeof latestRaw.completed_at === 'string' ? latestRaw.completed_at : null,
            downloadUrl: typeof latestRaw.download_url === 'string' ? latestRaw.download_url : null,
          }
        : null,
      pendingDeletion: pendingRaw
        ? {
            status: typeof pendingRaw.status === 'string' ? pendingRaw.status : 'pending',
            scheduledFor: typeof pendingRaw.scheduled_for === 'string' ? pendingRaw.scheduled_for : null,
          }
        : null,
    }
  } catch (_error) {
    return { latestExport: null, pendingDeletion: null }
  }
}

export default async function PrivacyDashboardPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const { data: authData } = await supabase.auth.getUser()
  const user = authData?.user

  if (!user) {
    redirect('/auth')
  }

  const summary = await loadPrivacyDashboardSummary(supabase, user.id)

  return (
    <div className="mt-10 px-2 lg:p-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col space-y-8 px-2">
        <div className="space-y-2 text-left">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Privacy dashboard</h1>
          <p className="text-base text-muted-foreground">
            Manage data exports and deletions directly from the portal. These tools create an audit trail for compliance and tenant peace of mind.
          </p>
        </div>
        <PrivacyDashboard email={user.email ?? null} summary={summary} />
      </div>
    </div>
  )
}
