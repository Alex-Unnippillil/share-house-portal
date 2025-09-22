import { randomUUID } from "crypto";

import { createClient } from "@/utils/supa-server-actions";
import { runWithQueryContext } from "@/utils/observability/query-context";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  return runWithQueryContext(
    {
      traceId: randomUUID(),
      route: 'app/api/sid/callback#GET',
      actor: 'sid-callback-route',
    },
    async () => {
      // The `/auth/callback` route is required for the server-side auth flow implemented
      // by the Auth Helpers package. It exchanges an auth code for the user's session.
      // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-sign-in-with-code-exchange
      const requestUrl = new URL(request.url);
      const code = requestUrl.searchParams.get("code");

      if (code) {
        const cookieStore = cookies();
        const supabase = createClient(cookieStore, {
          operation: 'sid-auth-callback',
          metadata: { handler: 'sid-callback' },
        });
        await supabase.auth.exchangeCodeForSession(code);
      }

      // URL to redirect to after sign in process completes
      return NextResponse.redirect(requestUrl.origin);
    }
  );
}