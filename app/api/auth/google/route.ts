import { randomUUID } from 'crypto'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { createClient } from '@/utils/supa-server-actions'
import { runWithQueryContext } from '@/utils/observability/query-context'

export async function GET(request: Request) {
  return runWithQueryContext(
    {
      traceId: randomUUID(),
      route: 'app/api/auth/google#GET',
      actor: 'api-auth-google-route',
    },
    async () => {
      const cookieStore = cookies()
      const supabase = createClient(cookieStore, {
        operation: 'auth-google',
        metadata: { handler: 'api-auth-google' },
      })

      const { searchParams, origin } = new URL(request.url)
      const next = searchParams.get('next') ?? '/'

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          redirectTo:
            process.env.GOOGLE_REDIRECT_URI ?? `${origin}/auth/callback`,
        },
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }

      if (data?.url) {
        return NextResponse.redirect(`${origin}${next}`)
      }

      return NextResponse.json(
        { error: 'Unable to initiate Google sign-in flow' },
        { status: 500 }
      )
    }
  )
}
