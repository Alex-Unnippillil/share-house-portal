'use server'; // Ensure this runs only on the server

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { siteConfig } from '@/config/site';
import type { Database } from '@/lib/supabase';

export async function createActionClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    siteConfig.thirdParty.supabase.baseUrl!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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