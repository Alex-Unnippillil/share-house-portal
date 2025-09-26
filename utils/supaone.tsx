import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from '@/lib/supabase'
import type { TypedSupabaseClient } from '@/utils/typed-supabase-client'
import { getSupabaseClientConfig } from '@/utils/supabase/env'

export async function createSupbaseServerClientReadOnly() {
        const cookieStore = cookies();
        const { url, anonKey } = getSupabaseClientConfig();

        return createServerClient(
                url,
                anonKey,
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
                                        cookieStore.set({ name, value: "", ...options });
                                },
                        },
                }
        );
}