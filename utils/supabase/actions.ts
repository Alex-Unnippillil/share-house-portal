'use server'; // Ensure this runs only on the server

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase';

import { getSupabaseServerClient } from './server';

export async function createActionClient(): Promise<SupabaseClient<Database>> {
  return getSupabaseServerClient();
}