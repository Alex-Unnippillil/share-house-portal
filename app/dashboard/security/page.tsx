import { redirect } from 'next/navigation'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SecuritySettingsForm } from './security-settings-form'
import { createSupbaseServerClient } from '@/utils/supaone'

export default async function SecurityPage() {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('ip_allow_cidrs, session_ttl_seconds')
    .eq('id', user.id)
    .maybeSingle()

  const cidrs = profile?.ip_allow_cidrs ?? []
  const sessionTtlMinutes =
    profile?.session_ttl_seconds != null
      ? Math.round(profile.session_ttl_seconds / 60)
      : null

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Security</h1>
        <p className="text-muted-foreground">
          Tighten access to the tenant dashboard with IP allowlists and short-lived sessions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenant session controls</CardTitle>
          <CardDescription>
            Define where roommates can sign in from and how long their session stays active before re-authentication is required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SecuritySettingsForm
            initialCidrs={cidrs}
            initialSessionTtlMinutes={sessionTtlMinutes}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Policy tips</CardTitle>
          <CardDescription>
            Combine IP controls with short TTLs to protect rent payments, documents, and booking approvals.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • Use /32 and /128 CIDRs for single trusted devices. Broader ranges such as /24 work well for household Wi-Fi.
          </p>
          <p>
            • Keep session TTLs under 8 hours for high-risk roles like property managers handling payouts or sensitive leases.
          </p>
          <p>
            • Leaving either field blank keeps Supabase defaults in place, making the portal accessible from any network with the
            standard session length.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
