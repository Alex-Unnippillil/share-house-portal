import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from '@/lib/supabase'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/utils/supabase/env'

export async function createSupabaseServerClientReadOnly() {
	const cookieStore = cookies();

	return createServerClient(
		getSupabaseUrl(),
		getSupabaseAnonKey(),
		{
			cookies: {
				get(name: string) {
					return cookieStore.get(name)?.value;
				},
			},
		}
	);
}

export async function createSupabaseServerClient() {
	const cookieStore = cookies();

	return createServerClient<Database>(
		getSupabaseUrl(),
		getSupabaseAnonKey(),
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

/**
 * @deprecated Use createSupabaseServerClientReadOnly. Keep this alias for one release cycle.
 */
export const createSupbaseServerClientReadOnly = createSupabaseServerClientReadOnly;

/**
 * @deprecated Use createSupabaseServerClient. Keep this alias for one release cycle.
 */
export const createSupbaseServerClient = createSupabaseServerClient;
