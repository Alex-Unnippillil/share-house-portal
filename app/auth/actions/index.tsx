"use server"

import type { VerifyOtpParams } from "@supabase/supabase-js"

import { redirect } from "next/navigation"

import { createSupbaseServerClient } from "@/utils/supaone"

interface Credentials {
  email: string
  password: string
}

function getSiteUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (siteUrl) return siteUrl
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return "http://localhost:3000"
}

export async function signUpWithEmailAndPassword(data: Credentials & { confirm: string }) {
  const supabase = await createSupbaseServerClient()
  const result = await supabase.auth.signUp(data)
  return { data: result.data, error: result.error }
}

export async function loginWithEmailAndPassword(data: Credentials) {
  const supabase = await createSupbaseServerClient()
  const result = await supabase.auth.signInWithPassword(data)
  return { data: result.data, error: result.error }
}

async function signInWithOAuthProvider(provider: "google" | "github" | "twitter") {
  const supabase = await createSupbaseServerClient()
  const baseUrl = getSiteUrl()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${baseUrl}/auth/sso-callback`,
      queryParams:
        provider === "google"
          ? {
              access_type: "offline",
              prompt: "consent",
            }
          : undefined,
    },
  })

  return { url: data?.url ?? null, error }
}

export async function signInWithGoogle() {
  return signInWithOAuthProvider("google")
}

export async function signInWithGithub() {
  return signInWithOAuthProvider("github")
}

export async function signInWithTwitter() {
  return signInWithOAuthProvider("twitter")
}

export async function requestPasswordReset({ email }: { email: string }) {
  const supabase = await createSupbaseServerClient()
  const baseUrl = getSiteUrl()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/auth/session-renewal`,
  })
  return { error }
}

export async function sendEmailOtp({ email }: { email: string }) {
  const supabase = await createSupbaseServerClient()
  const baseUrl = getSiteUrl()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${baseUrl}/auth/session-renewal`,
    },
  })
  return { error }
}

export async function verifyEmailOtp({ email, token }: { email: string; token: string }) {
  const supabase = await createSupbaseServerClient()
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  } as VerifyOtpParams)
  return { error }
}

export async function refreshActiveSession() {
  const supabase = await createSupbaseServerClient()
  const { error } = await supabase.auth.refreshSession()
  return { error }
}

export async function signOut() {
  const supabase = await createSupbaseServerClient()
  await supabase.auth.signOut()
  redirect("/")
}
