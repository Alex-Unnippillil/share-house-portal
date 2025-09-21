import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { normalizeDocumensoWebhookPayload } from "@/lib/documenso";
import type { Database } from "@/lib/supabase";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Supabase environment variables NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured for Documenso webhooks.",
  );
}

const adminClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export async function POST(request: Request) {
  const secret = process.env.DOCUMENSO_WEBHOOK_SECRET;
  if (secret) {
    const signature =
      request.headers.get("documenso-signature") ??
      request.headers.get("x-documenso-signature") ??
      request.headers.get("authorization");
    if (!signature || signature !== secret) {
      return NextResponse.json({ error: "Invalid Documenso webhook signature" }, { status: 401 });
    }
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const normalized = normalizeDocumensoWebhookPayload(payload);
  if (!normalized) {
    return NextResponse.json({ ok: true });
  }

  const now = new Date().toISOString();
  const updates: Partial<Database["public"]["Tables"]["lease_documents"]["Update"]> = {
    status: normalized.status,
    documenso_envelope_id: normalized.envelopeId,
    documenso_download_url: normalized.downloadUrl,
    signing_embed_url: normalized.signingUrl,
    last_synced_at: now,
  };

  if (normalized.status === "completed") {
    updates.completed_at = normalized.completedAt ?? now;
  } else {
    updates.completed_at = null;
  }

  const { error } = await adminClient
    .from("lease_documents")
    .update(updates)
    .eq("documenso_document_id", normalized.documentId);

  if (error) {
    console.error("Failed to persist Documenso webhook payload", error);
    return NextResponse.json({ error: "Failed to persist webhook" }, { status: 500 });
  }

  if (normalized.status === "completed" && normalized.recipientId) {
    await adminClient
      .from("resident_leases")
      .update({ signed_at: normalized.completedAt ?? now })
      .eq("documenso_recipient_id", normalized.recipientId);
  }

  if (normalized.status !== "completed" && normalized.recipientId) {
    await adminClient
      .from("resident_leases")
      .update({ signed_at: null })
      .eq("documenso_recipient_id", normalized.recipientId);
  }

  return NextResponse.json({ ok: true });
}
