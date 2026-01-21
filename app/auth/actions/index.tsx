"use server";

import type { SignInWithSSO } from "@supabase/supabase-js";
import { createSupbaseServerClient } from "@/utils/supaone";
import { redirect } from "next/navigation";
import { revalidatePath } from 'next/cache'

export async function signUpWithEmailAndPassword(data: {
        email: string;
        password: string;
        confirm: string;
}) {
        const supabase = await createSupbaseServerClient();

        const result = await supabase.auth.signUp(data);
        return JSON.stringify(result);


}

export async function loginWithEmailAndPassword(data: {
        email: string;
        password: string;
}) {
        const supabase = await createSupbaseServerClient();

        const result = await supabase.auth.signInWithPassword(data);
        return JSON.stringify(result);
}


export async function signInWithWorkOS(domain?: string) {
        const supabase = await createSupbaseServerClient();

        const trimmedDomain = domain?.trim();
        const workosProviderId = process.env.SUPABASE_WORKOS_CONNECTION_ID;
        const redirectTo = process.env.NEXT_PUBLIC_SITE_URL
                ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
                : undefined;

        if (!trimmedDomain && !workosProviderId) {
                return JSON.stringify({
                        error: "SUPABASE_WORKOS_CONNECTION_ID is not configured.",
                        url: null,
                });
        }

        const options = redirectTo ? { redirectTo } : undefined;

        let params: SignInWithSSO;

        if (trimmedDomain) {
                params = options
                        ? { domain: trimmedDomain, options }
                        : { domain: trimmedDomain };
        } else {
                params = options
                        ? { providerId: workosProviderId!, options }
                        : { providerId: workosProviderId! };
        }

        const { data, error } = await supabase.auth.signInWithSSO(params);

        if (error) {
                return JSON.stringify({ error: error.message, url: null });
        }

        if (!data?.url) {
                return JSON.stringify({
                        error: "The WorkOS sign-in URL could not be generated.",
                        url: null,
                });
        }

        return JSON.stringify({ error: null, url: data.url });
}


export async function signInWithGoogle() {

     const supabase = await createSupbaseServerClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
       redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
       queryParams: {
         access_type: 'offline',
         prompt: 'consent',
       },
    },
  })

if (data.url) {
  redirect(data.url)
 }
}

export async function signInWithGithub() {

     const supabase = await createSupbaseServerClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
       redirectTo: '/auth/callback',
    },
  })

if (data.url) {
  redirect(data.url)
 }
}
export async function signInWithTwitter() {

     const supabase = await createSupbaseServerClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'twitter',
    options: {
       redirectTo: '/auth/callback',
    },
  })

if (data.url) {
  redirect(data.url)
 }
}
export async function signOut() {
        const supabase = await createSupbaseServerClient();

        const { error } = await supabase.auth.signOut();
        redirect("/");
}