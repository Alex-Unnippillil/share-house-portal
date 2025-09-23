import { cookies } from 'next/headers'

import { getSupabaseServerClient } from '@/utils/supaone'

export function createClient(
  cookieStore: ReturnType<typeof cookies> = cookies()
) {
  return getSupabaseServerClient(cookieStore)
}
