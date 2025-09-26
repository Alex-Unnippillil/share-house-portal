import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { createServerClient } from '@/lib/supabase-client'

export default async function PrivatePage() {
  const cookieStore = cookies()
  const supabase = createServerClient(cookieStore)

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect('/')
  }

  return <p>Hello {data.user.email}</p>
}