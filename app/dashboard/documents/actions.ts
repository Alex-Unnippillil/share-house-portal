"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Database } from "@/lib/supabase";
import { DocumensoClient } from "@/lib/documenso-client";
import { normalizeEnvelopeStatus } from "@/lib/documenso-client";

type ActionState = {
  success: boolean;
  error?: string;
};

const schema = z.object({
  documentId: z.string().uuid(),
  templateId: z.string().min(1),
  tenantProfileId: z.string().uuid(),
  signerName: z.string().min(1, "Signer name is required."),
  signerEmail: z.string().email(),
  signerRole: z.string().default("tenant"),
});

export async function createLeaseEnvelopeAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Invalid form submission.";
    return { success: false, error: message };
  }

  const { documentId, templateId, tenantProfileId, signerEmail, signerName, signerRole } =
    parsed.data;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      success: false,
      error: "Supabase service role credentials are not configured.",
    };
  }

  const docClient = new DocumensoClient();
  if (!docClient.isConfigured) {
    return {
      success: false,
      error: "Documenso client is not configured.",
    };
  }

  const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey);

  try {
    const { data: latestVersion } = await adminClient
      .from("lease_versions")
      .select("version_number")
      .eq("document_id", documentId)
      .eq("tenant_profile_id", tenantProfileId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const versionNumber = (latestVersion?.version_number ?? 0) + 1;

    const envelope = await docClient.createEnvelopeFromTemplate(
      templateId,
      {
        name: `${signerName} v${versionNumber}`,
        signers: [
          {
            name: signerName,
            email: signerEmail,
            role: signerRole,
          },
        ],
        metadata: {
          documentId,
          tenantProfileId,
          versionNumber,
        },
      },
      { send: true },
    );

    if (!envelope?.id) {
      return { success: false, error: "Documenso did not return an envelope id." };
    }

    const normalizedStatus = envelope.status
      ? normalizeEnvelopeStatus(envelope.status)
      : "sent";

    const { data: leaseVersion, error: insertError } = await adminClient
      .from("lease_versions")
      .insert({
        document_id: documentId,
        tenant_profile_id: tenantProfileId,
        version_number: versionNumber,
        status: normalizedStatus,
        documenso_envelope_id: envelope.id,
        metadata: envelope.metadata ?? {
          documentId,
          tenantProfileId,
        },
        completed_at: envelope.completed_at ?? null,
        expires_at: envelope.expires_at ?? null,
      })
      .select("id")
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    const signerPayload = (envelope.signers?.length ? envelope.signers : null) ?? [
      {
        id: undefined,
        name: signerName,
        email: signerEmail,
        role: signerRole,
        status: normalizedStatus,
        signing_order: 1,
        signed_at: envelope.completed_at ?? null,
      },
    ];

    const { error: signerError } = await adminClient.from("document_signers").upsert(
      signerPayload.map((signer, index) => ({
        lease_version_id: leaseVersion.id,
        documenso_signer_id: signer.id ?? null,
        name: signer.name,
        email: signer.email,
        role: signer.role ?? signerRole,
        status: signer.status ? normalizeEnvelopeStatus(signer.status) : normalizedStatus,
        signing_order: signer.signing_order ?? index + 1,
        signed_at: signer.signed_at ?? null,
      })),
      { onConflict: "lease_version_id,email" },
    );

    if (signerError) {
      return { success: false, error: signerError.message };
    }

    revalidatePath("/dashboard/documents");
    revalidatePath("/dashboard/leases");

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}
