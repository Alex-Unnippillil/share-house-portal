import { cookies } from 'next/headers'

import { getSupabaseServerClient } from '@/utils/supaone'

export default function createSupabaseServer(
  cookieStore: ReturnType<typeof cookies>
) {
  return getSupabaseServerClient(cookieStore)
}
