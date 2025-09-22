import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { VisitorRequestForm } from '@/components/visitor-request-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { createClient } from '@/utils/supa-server-actions'

export default async function NewVisitorRequestPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  const displayName = profile?.full_name ?? user.email ?? 'Roommate'

  return (
    <section className="container mx-auto flex max-w-3xl flex-col gap-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Register an overnight visitor</h1>
        <p className="text-muted-foreground">
          Log your guest&apos;s stay so your roommates and property manager stay in the loop.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visitor details</CardTitle>
          <CardDescription>
            Submissions notify your roommates and property manager for review and approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-md bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            Submitting as{' '}
            <span className="font-medium text-foreground">{displayName}</span>
          </div>
          <VisitorRequestForm />
        </CardContent>
      </Card>
    </section>
  )
}
