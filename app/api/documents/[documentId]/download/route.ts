import { NextRequest } from "next/server";

import { downloadEnvelopeDocument } from "@/lib/documenso-client";
import {
  DocumentWithRelations,
  filterDocumentsForViewer,
  getActiveLeaseVersion,
  getLatestCompletedLeaseVersion,
  getLeaseVersions,
} from "@/lib/documents-service";
import { createSupbaseServerClient } from "@/utils/supaone";

export async function GET(
  request: NextRequest,
  { params }: { params: { documentId: string } },
) {
  const documentId = params.documentId;
  if (!documentId) {
    return new Response("Missing document id", { status: 400 });
  }

  const supabase = await createSupbaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return new Response("Authentication required", { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", session.user.id)
    .single();

  const leaseVersionId = request.nextUrl.searchParams.get("leaseVersion");

  const { data, error } = await supabase
    .from("documents")
    .select(
      "*, tenant:profiles!documents_tenant_id_fkey(id, full_name, email), lease_versions(*)",
    )
    .eq("id", documentId)
    .maybeSingle();

  if (error || !data) {
    return new Response("Document not found", { status: 404 });
  }

  const document = data as DocumentWithRelations;
  const accessible = filterDocumentsForViewer([document], session.user.id, profile?.role);

  if (accessible.length === 0) {
    return new Response("Not authorised", { status: 403 });
  }

  const versions = getLeaseVersions(document);
  const targetVersion = leaseVersionId
    ? versions.find((version) => version.id === leaseVersionId)
    : getLatestCompletedLeaseVersion(document) ?? getActiveLeaseVersion(document);

  if (!targetVersion?.documenso_envelope_id) {
    return new Response("Envelope not available", { status: 404 });
  }

  const download = await downloadEnvelopeDocument(targetVersion.documenso_envelope_id);

  await supabase.from("document_download_audit").insert({
    document_id: document.id,
    lease_version_id: targetVersion.id,
    downloaded_by: session.user.id,
    documenso_envelope_id: targetVersion.documenso_envelope_id,
    source: "portal",
    remote_addr: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: request.headers.get("user-agent"),
  });

  const buffer = Buffer.from(new Uint8Array(download.data));
  const disposition = `attachment; filename="${download.filename}"`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": download.contentType,
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
