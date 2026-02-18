"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createSupbaseServerClient } from "@/utils/supaone"
import type { SignInWithSSO } from "@supabase/supabase-js"

type AuthActionResponse = {
  data: unknown
  error: { message: string } | null
}

function missingSupabaseEnvResponse() {
  return JSON.stringify({
    data: null,
    error: {
      message:
        "Supabase environment variables are missing. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    },
  } satisfies AuthActionResponse)
}

function unknownErrorResponse(error: unknown) {
  return JSON.stringify({
    data: null,
    error: {
      message:
        error instanceof Error
          ? error.message
          : "Authentication request failed.",
    },
  } satisfies AuthActionResponse)
}

export async function signUpWithEmailAndPassword(data: {
  email: string
  password: string
  confirm: string
}) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return missingSupabaseEnvResponse()
  }

  try {
    const supabase = await createSupbaseServerClient()
    const result = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })

    return JSON.stringify(result)
  } catch (error) {
    return unknownErrorResponse(error)
  }
}

export async function loginWithEmailAndPassword(data: {
  email: string
  password: string
}) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return missingSupabaseEnvResponse()
  }

  try {
    const supabase = await createSupbaseServerClient()
    const result = await supabase.auth.signInWithPassword(data)
    revalidatePath("/", "layout")

    return JSON.stringify(result)
  } catch (error) {
    return unknownErrorResponse(error)
  }
}

export async function signInWithWorkOS(domain?: string) {
  const supabase = await createSupbaseServerClient()

  const trimmedDomain = domain?.trim()
  const workosProviderId = process.env.SUPABASE_WORKOS_CONNECTION_ID
  const redirectTo = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
    : undefined

  if (!trimmedDomain && !workosProviderId) {
    return JSON.stringify({
      error: "SUPABASE_WORKOS_CONNECTION_ID is not configured.",
      url: null,
    })
  }

  const options = redirectTo ? { redirectTo } : undefined

  let params: SignInWithSSO

  if (trimmedDomain) {
    params = options
      ? { domain: trimmedDomain, options }
      : { domain: trimmedDomain }
  } else {
    params = options
      ? { providerId: workosProviderId!, options }
      : { providerId: workosProviderId! }
  }

  const { data, error } = await supabase.auth.signInWithSSO(params)

  if (error) {
    return JSON.stringify({ error: error.message, url: null })
  }

  if (!data?.url) {
    return JSON.stringify({
      error: "The WorkOS sign-in URL could not be generated.",
      url: null,
    })
  }

  return JSON.stringify({ error: null, url: data.url })
}

export async function signInWithGoogle() {
  const supabase = await createSupbaseServerClient()

  const { data } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  })

  if (data.url) {
    redirect(data.url)
  }
}

/*

export async function signInWithGoogle(): Promise<{ error?: string; url?: string }> {
  try {
    const supabase = createSupbaseServerClient()

    
    const { data, error } = await (await supabase).auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });

     (await supabase).auth.onAuthStateChange((event, session) => {
      if (session && session.provider_token) {
        window.localStorage.setItem('oauth_provider_token', session.provider_token)
      }
    
      if (session && session.provider_refresh_token) {
        window.localStorage.setItem('oauth_provider_refresh_token', session.provider_refresh_token)
      }
    
      if (event === 'SIGNED_OUT') {
        window.localStorage.removeItem('oauth_provider_token')
        window.localStorage.removeItem('oauth_provider_refresh_token')
      }
    })

    if (error) {
      return { error: error.message }
    }
    

    return { url: data.url }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "An unknown error occurred" }
  }
}

*/

export async function signInWithGithub() {
  const supabase = await createSupbaseServerClient()
  const { data } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: "/auth/callback",
    },
  })

  if (data.url) {
    redirect(data.url)
  }
}
export async function signInWithTwitter() {
  const supabase = await createSupbaseServerClient()
  const { data } = await supabase.auth.signInWithOAuth({
    provider: "twitter",
    options: {
      redirectTo: "/auth/callback",
    },
  })

  if (data.url) {
    redirect(data.url)
  }
}
export async function signOut() {
  const supabase = await createSupbaseServerClient()
  await supabase.auth.signOut()
  redirect("/")
}
