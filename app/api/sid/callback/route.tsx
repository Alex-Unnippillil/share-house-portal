import { createClient } from "@/utils/supa-server-actions";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { timeExternal, withServerTiming } from "@/lib/server-timing";

async function handleSupabaseCallback(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the Auth Helpers package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-sign-in-with-code-exchange
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    await timeExternal("supabase.auth.exchangeCodeForSession", () =>
      supabase.auth.exchangeCodeForSession(code)
    );
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(requestUrl.origin);
}

export const GET = withServerTiming(handleSupabaseCallback, "api.sid.callback")