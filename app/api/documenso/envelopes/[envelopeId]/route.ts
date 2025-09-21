import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase";
import { DocumensoClient } from "@/lib/documenso-client";

export async function GET(
  request: Request,
  { params }: { params: { envelopeId: string } },
) {
  const docClient = new DocumensoClient();
  if (!docClient.isConfigured) {
    return Response.json(
      { error: "Documenso client is not configured." },
      { status: 500 },
    );
  }

  const { envelopeId } = params;

  let fileBuffer: ArrayBuffer;
  try {
    fileBuffer = await docClient.downloadEnvelope(envelopeId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 502 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let profileId: string | null = null;

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const cookieStore = cookies();
      const supabase = createServerClient<Database>(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            get(name) {
              return cookieStore.get(name)?.value;
            },
            set() {
              /* no-op */
            },
            remove() {
              /* no-op */
            },
          },
        },
      );

      const {
        data: { session },
      } = await supabase.auth.getSession();
      profileId = session?.user?.id ?? null;
    } catch (error) {
      profileId = null;
    }
  }

  if (supabaseUrl && serviceRoleKey) {
    const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey);
    try {
      const { data: lease } = await adminClient
        .from("lease_versions")
        .select("id")
        .eq("documenso_envelope_id", envelopeId)
        .maybeSingle();

      await adminClient.from("document_download_logs").insert({
        lease_version_id: lease?.id ?? null,
        profile_id: profileId,
        documenso_envelope_id: envelopeId,
        ip_address:
          request.headers.get("x-forwarded-for") ??
          request.headers.get("x-real-ip") ??
          null,
        user_agent: request.headers.get("user-agent") ?? null,
      });
    } catch (error) {
      // Logging should not block downloads; swallow errors.
    }
  }

  const body = Buffer.from(fileBuffer);
  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": body.length.toString(),
      "Content-Disposition": `attachment; filename=documenso-${envelopeId}.pdf`,
      "Cache-Control": "no-store",
    },
  });
}
