'use server'

import { cookies } from 'next/headers'

import { getSupabaseServerClient } from '@/utils/supaone'

export async function createActionClient() {
  return getSupabaseServerClient(cookies())
}
