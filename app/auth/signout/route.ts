import { randomUUID } from 'crypto'

import { createClient } from '@/utils/supabase/server'
import { runWithQueryContext } from '@/utils/observability/query-context'
import { revalidatePath } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  return runWithQueryContext(
    {
      traceId: randomUUID(),
      route: 'app/auth/signout#POST',
      actor: 'auth-signout-route',
    },
    async () => {
      const supabase = createClient({
        operation: 'auth-signout',
        metadata: { action: 'auth-signout' },
      })

      // Check if a user's logged in
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        await supabase.auth.signOut()
      }

      revalidatePath('/', 'layout')
      return NextResponse.redirect(new URL('/auth', req.url), {
        status: 302,
      })
    }
  )
}