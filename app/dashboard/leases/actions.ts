"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { canTransitionLeaseDocumentStatus, mapDocumensoStatus } from "@/lib/lease-documents";
import {
  createDocumensoSignatureRequest,
  fetchDocumensoDocument,
} from "@/lib/documenso";
import { createActionClient } from "@/utils/supabase/actions";
import type { Database } from "@/lib/supabase";

const LEASES_PATH = "/dashboard/leases";

function assertDocumentId(value: FormDataEntryValue | null, action: string): string {
  if (typeof value !== "string" || !value) {
    throw new Error(`${action} requires a valid lease document id.`);
  }

  return value;
}

async function fetchLeaseDocument(
  client: Awaited<ReturnType<typeof createActionClient>>,
  documentId: string,
  userId: string,
) {
  const { data, error } = await client
    .from("lease_documents")
    .select("id, lease_id, status, name, documenso_document_id, documenso_envelope_id, signing_embed_url, requested_at")
    .eq("id", documentId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Lease document could not be located.");
  }

  const { data: assignment, error: assignmentError } = await client
    .from("resident_leases")
    .select("resident_id, lease_id, role, is_primary, signed_at, documenso_recipient_id")
    .eq("lease_id", data.lease_id)
    .eq("resident_id", userId)
    .maybeSingle();

  if (assignmentError || !assignment) {
    throw new Error("You do not have permission to modify this lease document.");
  }

  return { document: data, assignment };
}

export async function requestLeaseSignature(formData: FormData) {
  const documentId = assertDocumentId(formData.get("documentId"), "Request signature");

  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { document, assignment } = await fetchLeaseDocument(supabase, documentId, user.id);

  if (!canTransitionLeaseDocumentStatus(document.status, "awaiting_signature")) {
    throw new Error("This document cannot transition to an awaiting signature state.");
  }

  const signatureResult = await createDocumensoSignatureRequest(document.documenso_document_id, {
    recipientId: assignment.documenso_recipient_id,
    email: user.email ?? undefined,
    name:
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : typeof user.user_metadata?.name === "string"
          ? user.user_metadata.name
          : undefined,
    redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_VERCEL_URL ?? ""}${LEASES_PATH}` || undefined,
  });

  const now = new Date().toISOString();
  const updatePayload: Partial<Database["public"]["Tables"]["lease_documents"]["Update"]> = {
    status: "awaiting_signature",
    requested_at: now,
    signing_embed_url: signatureResult.signingUrl ?? document.signing_embed_url ?? null,
    documenso_envelope_id: signatureResult.envelopeId ?? document.documenso_envelope_id ?? null,
    last_synced_at: now,
  };

  const { error: updateError } = await supabase
    .from("lease_documents")
    .update(updatePayload)
    .eq("id", document.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  await supabase
    .from("resident_leases")
    .update({ signed_at: null })
    .eq("lease_id", document.lease_id)
    .eq("resident_id", user.id);

  revalidatePath(LEASES_PATH);
}

export async function refreshLeaseDocumentStatus(formData: FormData) {
  const documentId = assertDocumentId(formData.get("documentId"), "Status sync");

  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { document } = await fetchLeaseDocument(supabase, documentId, user.id);

  const docDetails = await fetchDocumensoDocument(document.documenso_document_id);
  const nextStatus = mapDocumensoStatus(docDetails.status);

  if (!canTransitionLeaseDocumentStatus(document.status, nextStatus)) {
    revalidatePath(LEASES_PATH);
    return;
  }

  const now = new Date().toISOString();
  const updatePayload: Partial<Database["public"]["Tables"]["lease_documents"]["Update"]> = {
    status: nextStatus,
    documenso_envelope_id: docDetails.envelopeId ?? document.documenso_envelope_id ?? null,
    documenso_download_url: docDetails.downloadUrl ?? document.documenso_download_url ?? null,
    signing_embed_url: docDetails.embedUrl ?? document.signing_embed_url ?? null,
    completed_at: nextStatus === "completed" ? docDetails.completedAt ?? now : document.completed_at,
    last_synced_at: now,
  };

  const { error } = await supabase
    .from("lease_documents")
    .update(updatePayload)
    .eq("id", document.id);

  if (error) {
    throw new Error(error.message);
  }

  if (nextStatus === "completed") {
    await supabase
      .from("resident_leases")
      .update({ signed_at: docDetails.completedAt ?? now })
      .eq("lease_id", document.lease_id)
      .eq("resident_id", user.id);
  }

  revalidatePath(LEASES_PATH);
}

export async function downloadLeaseDocument(formData: FormData) {
  const documentId = assertDocumentId(formData.get("documentId"), "Download");

  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { document } = await fetchLeaseDocument(supabase, documentId, user.id);

  if (!document.storage_path) {
    throw new Error("No stored file is associated with this lease document.");
  }

  const { data: signedUrl, error } = await supabase.storage
    .from("lease-documents")
    .createSignedUrl(document.storage_path, 60 * 5);

  if (error || !signedUrl?.signedUrl) {
    throw new Error(error?.message ?? "Unable to generate download link.");
  }

  redirect(signedUrl.signedUrl);
}
