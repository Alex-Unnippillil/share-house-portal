"use server";

import { revalidatePath } from "next/cache";

import {
  createEnvelopeFromTemplate,
  getDocumensoEnvelope,
} from "@/lib/documenso-client";
import {
  DocumentStatus,
  DocumentWithRelations,
  coerceMetadata,
  documentStatusFromEnvelope,
  extractSigningUrlForRecipient,
  filterDocumentsForViewer,
  getActiveLeaseVersion,
  getNextLeaseVersionNumber,
  isManagerRole,
  leaseVersionToUpdatePayload,
  mapDocumensoStatusToDocumentStatus,
  mapRecipientsToSigners,
  shouldAllowNewEnvelope,
} from "@/lib/documents-service";
import type { Json } from "@/lib/supabase";
import { createSupbaseServerClient } from "@/utils/supaone";

export type SendDocumentResult = {
  success?: boolean;
  error?: string;
  status?: DocumentStatus;
  envelopeId?: string;
  signingUrl?: string | null;
};

export type RefreshDocumentStatusInput = {
  documentId: string;
  openForSigner?: boolean;
};

export type RefreshDocumentStatusResult = {
  success?: boolean;
  error?: string;
  status?: DocumentStatus;
  envelopeId?: string;
  signingUrl?: string | null;
};

async function getViewerContext() {
  const supabase = await createSupbaseServerClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session?.user) {
    return { supabase, session: null, profile: null } as const;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", session.user.id)
    .single();

  if (profileError) {
    throw profileError;
  }

  return { supabase, session, profile } as const;
}

async function getDocumentById(supabase: ReturnType<typeof createSupbaseServerClient> extends Promise<infer T> ? T : never, documentId: string) {
  const { data, error } = await supabase
    .from("documents")
    .select(
      "*, tenant:profiles!documents_tenant_id_fkey(id, full_name, email), lease_versions(*)",
    )
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as DocumentWithRelations | null;
}

export async function sendDocumentForSignatureAction(documentId: string): Promise<SendDocumentResult> {
  try {
    if (!documentId) {
      return { error: "Document identifier is required." };
    }

    const { supabase, session, profile } = await getViewerContext();

    if (!session?.user) {
      return { error: "You must be signed in to send documents." };
    }

    if (!profile || !isManagerRole(profile.role)) {
      return { error: "Only property managers can initiate Documenso envelopes." };
    }

    const document = await getDocumentById(supabase, documentId);

    if (!document) {
      return { error: "Document not found." };
    }

    if (!shouldAllowNewEnvelope(document)) {
      return {
        error: "A Documenso envelope is already in progress for this document.",
        status: document.status,
      };
    }

    if (!document.tenant_id || !document.tenant?.email) {
      return {
        error: "Tenant contact information is missing. Add a tenant email before sending.",
      };
    }

    const recipients = [
      {
        name: document.tenant.full_name ?? document.tenant.email,
        email: document.tenant.email,
        role: "tenant",
        signingOrder: 1,
      },
    ];

    if (profile.email) {
      recipients.push({
        name: profile.full_name ?? profile.email,
        email: profile.email,
        role: "manager",
        signingOrder: 2,
      });
    }

    const metadata = coerceMetadata(document.metadata);
    const timestamp = new Date().toISOString();

    const envelope = await createEnvelopeFromTemplate({
      templateId: document.documenso_template_id,
      recipients,
      metadata: {
        ...metadata,
        documentId: document.id,
        tenantId: document.tenant_id,
        createdBy: profile.id,
        requestedAt: timestamp,
      },
      redirectUrl: process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/documents`
        : undefined,
    });

    const versionNumber = getNextLeaseVersionNumber(document);
    const leaseInsert = {
      document_id: document.id,
      version: versionNumber,
      documenso_envelope_id: envelope.id,
      status: mapDocumensoStatusToDocumentStatus(envelope.status),
      signers: mapRecipientsToSigners(envelope.recipients ?? []) as Json,
      sent_at: timestamp,
      expires_at: envelope.expiresAt ?? null,
    } as const;

    const { error: leaseError } = await supabase.from("lease_versions").insert(leaseInsert);
    if (leaseError) {
      return { error: leaseError.message };
    }

    const nextStatus = mapDocumensoStatusToDocumentStatus(envelope.status);
    const updatedMetadata = {
      ...metadata,
      lastEnvelopeId: envelope.id,
      lastSentAt: timestamp,
    } satisfies Record<string, unknown>;

    const { error: documentError } = await supabase
      .from("documents")
      .update({
        status: nextStatus,
        active_envelope_id: envelope.id,
        metadata: updatedMetadata as Json,
        created_by: profile.id,
      })
      .eq("id", document.id);

    if (documentError) {
      return { error: documentError.message };
    }

    revalidatePath("/dashboard/documents");
    revalidatePath("/dashboard/leases");

    return {
      success: true,
      status: nextStatus,
      envelopeId: envelope.id,
      signingUrl: envelope.recipients?.[0]?.signingUrl ?? null,
    };
  } catch (error) {
    console.error("sendDocumentForSignatureAction", error);
    return {
      error: error instanceof Error ? error.message : "Unable to send Documenso envelope.",
    };
  }
}

export async function refreshDocumentStatusAction(
  input: RefreshDocumentStatusInput,
): Promise<RefreshDocumentStatusResult> {
  try {
    const documentId = input?.documentId;
    if (!documentId) {
      return { error: "Document identifier is required." };
    }

    const { supabase, session, profile } = await getViewerContext();

    if (!session?.user) {
      return { error: "You must be signed in to refresh document status." };
    }

    const document = await getDocumentById(supabase, documentId);

    if (!document) {
      return { error: "Document not found." };
    }

    const accessible = filterDocumentsForViewer([document], session.user.id, profile?.role);
    if (accessible.length === 0) {
      return { error: "You do not have access to this document." };
    }

    const activeVersion = getActiveLeaseVersion(document);
    if (!activeVersion) {
      return {
        error: "No envelope has been created for this document yet.",
        status: document.status,
      };
    }

    const envelope = await getDocumensoEnvelope(activeVersion.documenso_envelope_id);
    const leaseUpdate = leaseVersionToUpdatePayload(envelope, activeVersion);
    const documentUpdate = documentStatusFromEnvelope(envelope, document);
    const nextStatus = documentUpdate.status ?? document.status;

    const metadata = {
      ...coerceMetadata(document.metadata),
      lastSyncedAt: new Date().toISOString(),
      lastKnownEnvelopeStatus: nextStatus,
    } satisfies Record<string, unknown>;

    const { error: leaseError } = await supabase
      .from("lease_versions")
      .update(leaseUpdate)
      .eq("id", activeVersion.id);

    if (leaseError) {
      return { error: leaseError.message };
    }

    const { error: documentError } = await supabase
      .from("documents")
      .update({
        ...documentUpdate,
        metadata: metadata as Json,
      })
      .eq("id", document.id);

    if (documentError) {
      return { error: documentError.message };
    }

    revalidatePath("/dashboard/documents");
    revalidatePath("/dashboard/leases");

    let signingUrl: string | null = null;
    if (input.openForSigner) {
      const candidateEmail = profile?.email ?? session.user.email ?? null;
      if (candidateEmail) {
        signingUrl =
          extractSigningUrlForRecipient(envelope, candidateEmail) ??
          signingUrl;
      }
    }

    return {
      success: true,
      status: nextStatus,
      envelopeId: envelope.id,
      signingUrl,
    };
  } catch (error) {
    console.error("refreshDocumentStatusAction", error);
    return {
      error: error instanceof Error ? error.message : "Unable to refresh document status.",
    };
  }
}
