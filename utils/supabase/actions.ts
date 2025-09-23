'use server'; // Ensure this runs only on the server

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/supabase';

import {
  getSupabaseCookieSecurityContext,
  withSupabaseCookieDefaults,
} from '@/utils/supabase/cookie-helpers';

export async function createActionClient() {
  const cookieStore = cookies();
  const securityContext = getSupabaseCookieSecurityContext();
  const applyCookieDefaults = (options: CookieOptions) =>
    withSupabaseCookieDefaults(options, securityContext);

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          const normalized = applyCookieDefaults(options);
          cookieStore.set({ name, value, ...normalized });
        },
        remove(name: string, options: CookieOptions) {
          const normalized = applyCookieDefaults(options);
          cookieStore.set({ name, value: '', ...normalized });
        },
      },
    }
  );
}
