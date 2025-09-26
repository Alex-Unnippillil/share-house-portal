'use server'; // Ensure this runs only on the server

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

import type { Database } from '@/lib/supabase';
import { getSupabaseClientConfig } from '@/utils/supabase/env';

export async function createActionClient() {
  const cookieStore = cookies();

  const { url, anonKey } = getSupabaseClientConfig();

  return createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}