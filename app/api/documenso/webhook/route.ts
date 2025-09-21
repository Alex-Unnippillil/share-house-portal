import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";

import { createClient } from "@supabase/supabase-js";

import {
  coerceMetadata,
  documentStatusFromEnvelope,
  leaseVersionToUpdatePayload,
} from "@/lib/documents-service";
import { getDocumensoEnvelope } from "@/lib/documenso-client";
import type { Database, Json } from "@/lib/supabase";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase service credentials are not configured");
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.DOCUMENSO_WEBHOOK_SECRET;
    if (secret) {
      const signature = request.headers.get("x-documenso-signature");
      if (signature !== secret) {
        return new Response("Invalid signature", { status: 401 });
      }
    }

    const payload = await request.json();
    const envelopeId: string | undefined =
      payload?.envelope_id ??
      payload?.data?.envelope_id ??
      payload?.data?.id ??
      payload?.envelope?.id ??
      payload?.id;

    if (!envelopeId) {
      return new Response("Missing envelope identifier", { status: 400 });
    }

    const supabase = getServiceClient();
    const { data: leaseVersion } = await supabase
      .from("lease_versions")
      .select("*")
      .eq("documenso_envelope_id", envelopeId)
      .maybeSingle();

    if (!leaseVersion) {
      return Response.json({ ok: true });
    }

    const { data: document } = await supabase
      .from("documents")
      .select("*")
      .eq("id", leaseVersion.document_id)
      .single();

    if (!document) {
      return Response.json({ ok: true });
    }

    const envelope = await getDocumensoEnvelope(envelopeId);
    const leaseUpdate = leaseVersionToUpdatePayload(envelope, leaseVersion);
    const typedDocument = { ...document, lease_versions: [leaseVersion] };
    const docUpdate = documentStatusFromEnvelope(envelope, typedDocument);

    const metadata = {
      ...coerceMetadata(document.metadata),
      lastWebhookAt: new Date().toISOString(),
      lastWebhookEvent: payload?.type ?? envelope.status,
    } as Record<string, unknown>;

    await supabase
      .from("lease_versions")
      .update(leaseUpdate)
      .eq("id", leaseVersion.id);

    await supabase
      .from("documents")
      .update({
        ...docUpdate,
        metadata: metadata as Json,
      })
      .eq("id", document.id);

    revalidatePath("/dashboard/documents");
    revalidatePath("/dashboard/leases");

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Documenso webhook error", error);
    return new Response("Webhook processing failed", { status: 500 });
  }
}
