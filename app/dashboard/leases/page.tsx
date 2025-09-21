import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RefreshStatusButton, SendForSignatureButton } from "../documents/components/document-actions";
import { StatusBadge } from "../documents/components/status-badge";
import {
  DocumentWithRelations,
  getActiveLeaseVersion,
  getLatestCompletedLeaseVersion,
  getLeaseVersions,
  isManagerRole,
  resolveDocumentStatus,
  shouldAllowNewEnvelope,
} from "@/lib/documents-service";
import { createSupbaseServerClient } from "@/utils/supaone";

export const metadata: Metadata = {
  title: "Lease management",
};

export default async function LeasesPage() {
  const supabase = await createSupbaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", session.user.id)
    .single();

  const { data, error } = await supabase
    .from("documents")
    .select(
      "*, tenant:profiles!documents_tenant_id_fkey(id, full_name, email), lease_versions(*)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load documents", error);
  }

  const documents = (data ?? []) as DocumentWithRelations[];
  const isManager = isManagerRole(profile?.role);

  if (!isManager) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Leases</h1>
          <p className="text-sm text-muted-foreground">
            This view is limited to property managers. You can review your own agreements on the Documents page.
          </p>
        </div>
      </div>
    );
  }

  const rows = documents.map((document) => {
    const activeVersion = getActiveLeaseVersion(document);
    const latestCompleted = getLatestCompletedLeaseVersion(document);
    const status = resolveDocumentStatus(document);

    return {
      document,
      activeVersion,
      latestCompleted,
      status,
      canSend: shouldAllowNewEnvelope(document),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Lease workflows</h1>
        <p className="text-sm text-muted-foreground">
          Track Documenso envelopes across all tenants, resend templates, and download completed agreements.
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Document</th>
              <th className="px-4 py-3 text-left font-medium">Tenant</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Active envelope</th>
              <th className="px-4 py-3 text-left font-medium">Versions</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {rows.map(({ document, activeVersion, latestCompleted, status, canSend }) => (
              <tr key={document.id} className="align-top">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{document.title}</div>
                  <div className="text-xs text-muted-foreground">
                    Template {document.documenso_template_id}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">
                    {document.tenant?.full_name ?? document.tenant?.email ?? "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">{document.tenant?.email ?? ""}</div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={status} />
                  <div className="mt-1 text-xs text-muted-foreground">
                    {document.active_envelope_id ?? "No active envelope"}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  <div className="font-medium text-foreground">
                    {activeVersion ? `Version ${activeVersion.version}` : "—"}
                  </div>
                  <div>
                    {activeVersion?.documenso_envelope_id ?? "Awaiting envelope"}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  <div>{getLeaseVersions(document).length} versions</div>
                  {latestCompleted ? (
                    <Link
                      className="mt-1 inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      href={`/api/documents/${document.id}/download?leaseVersion=${latestCompleted.id}`}
                    >
                      Download signed copy
                    </Link>
                  ) : (
                    <span className="mt-1 block">No signed version yet</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-2">
                    <SendForSignatureButton documentId={document.id} disabled={!canSend} />
                    <RefreshStatusButton documentId={document.id} disabled={!activeVersion} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
