import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase";
import { buildLeaseSyncResult } from "@/lib/documents-sync";
import { normalizeEnvelopeStatus } from "@/lib/documenso-client";
import type { DocumensoWebhookEvent } from "@/lib/documents-sync";

const WEBHOOK_SECRET_HEADER = "x-documenso-webhook-secret";

function verifyWebhookSecret(request: Request) {
  const secret = process.env.DOCUMENSO_WEBHOOK_SECRET;
  if (!secret) return true;

  const provided =
    request.headers.get(WEBHOOK_SECRET_HEADER) ??
    request.headers.get(WEBHOOK_SECRET_HEADER.toUpperCase());

  return provided === secret;
}

export async function POST(request: Request) {
  if (!verifyWebhookSecret(request)) {
    return Response.json({ error: "Invalid webhook secret." }, { status: 401 });
  }

  let payload: DocumensoWebhookEvent;
  try {
    payload = (await request.json()) as DocumensoWebhookEvent;
  } catch (error) {
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json(
      { error: "Supabase credentials are not configured." },
      { status: 500 },
    );
  }

  const envelopeId = payload?.data?.envelope?.id;
  if (!envelopeId) {
    return Response.json(
      { error: "Webhook payload missing envelope id." },
      { status: 400 },
    );
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey);
  const { data: lease, error: leaseError } = await supabase
    .from("lease_versions")
    .select("id,status")
    .eq("documenso_envelope_id", envelopeId)
    .maybeSingle();

  if (leaseError) {
    return Response.json({ error: leaseError.message }, { status: 500 });
  }

  if (!lease) {
    return Response.json({ message: "Envelope does not match any lease." }, { status: 200 });
  }

  const currentStatus = lease.status
    ? normalizeEnvelopeStatus(lease.status)
    : null;
  const syncResult = buildLeaseSyncResult(payload, currentStatus);

  if (Object.keys(syncResult.leaseUpdate).length > 0) {
    const { error: updateError } = await supabase
      .from("lease_versions")
      .update({
        ...syncResult.leaseUpdate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lease.id);

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 });
    }
  }

  if (syncResult.signerUpdates.length > 0) {
    const inserts = syncResult.signerUpdates.map((signer) => ({
      ...signer,
      lease_version_id: lease.id,
    }));

    const { error: signerError } = await supabase
      .from("document_signers")
      .upsert(inserts, { onConflict: "lease_version_id,email" });

    if (signerError) {
      return Response.json({ error: signerError.message }, { status: 500 });
    }
  }

  return Response.json({ received: true });
}
