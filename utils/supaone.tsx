import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import { siteConfig } from '@/config/site'
import type { Database } from '@/lib/supabase'
import type { TypedSupabaseClient } from '@/utils/typed-supabase-client'

export async function createSupbaseServerClientReadOnly() {
	const cookieStore = cookies();

        return createServerClient(
                siteConfig.thirdParty.supabase.baseUrl!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				get(name: string) {
					return cookieStore.get(name)?.value;
				},
			},
		}
	);
}

export async function createSupbaseServerClient() {
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
					cookieStore.set({ name, value: "", ...options });
				},
			},
		}
	);
}