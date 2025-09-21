import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase';

const missingEnvMessage = (name: string) => `Missing required Supabase environment variable: ${name}`;

export const createServiceRoleClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(missingEnvMessage('NEXT_PUBLIC_SUPABASE_URL'));
  }

  if (!serviceKey) {
    throw new Error(missingEnvMessage('SUPABASE_SERVICE_ROLE_KEY'));
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
