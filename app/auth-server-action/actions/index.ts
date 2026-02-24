"use server"

import { redirect } from "next/navigation"
import { createSupbaseServerClient } from "@/utils/supaone"
import { hasSupabasePublicEnv } from "@/utils/supabase/env"

export async function signUpWithEmailAndPassword(data: {
  email: string
  password: string
  confirm: string
}) {
  if (!hasSupabasePublicEnv()) {
    return JSON.stringify({
      data: null,
      error: {
        message:
          "Supabase environment variables are missing. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).",
      },
    })
  }

  const supabase = await createSupbaseServerClient()
  const result = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
  })
  return JSON.stringify(result)
}

export async function logout() {
  const supabase = await createSupbaseServerClient()
  await supabase.auth.signOut()
  redirect("/auth")
}
