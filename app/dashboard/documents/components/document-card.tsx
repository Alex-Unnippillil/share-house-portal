import Link from "next/link";
import { format } from "date-fns";
import { FileDown } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ContinueSigningButton,
  RefreshStatusButton,
  SendForSignatureButton,
} from "./document-actions";
import { StatusBadge } from "./status-badge";
import {
  DocumentWithRelations,
  SignerMetadata,
  getActiveLeaseVersion,
  getLatestCompletedLeaseVersion,
  getLeaseVersions,
  isManagerRole,
  parseSigners,
  resolveDocumentStatus,
  shouldAllowNewEnvelope,
  STATUS_LABELS,
} from "@/lib/documents-service";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  try {
    return format(new Date(value), "MMM d, yyyy");
  } catch (error) {
    return value;
  }
}

function SignerList({ signers }: { signers: SignerMetadata[] }) {
  if (!signers.length) {
    return <p className="text-sm text-muted-foreground">No signer metadata available yet.</p>;
  }

  return (
    <ul className="space-y-1 text-sm text-muted-foreground">
      {signers.map((signer, index) => (
        <li key={`${signer.email ?? signer.name ?? "signer"}-${index}`}>
          <span className="font-medium text-foreground">{signer.name ?? signer.email}</span>
          {signer.email ? <span className="ml-1">({signer.email})</span> : null}
          {signer.status ? (
            <Badge className="ml-2" variant="outline">
              {signer.status}
            </Badge>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function DocumentCard({
  document,
  viewerRole,
}: {
  document: DocumentWithRelations;
  viewerRole?: string | null;
}) {
  const status = resolveDocumentStatus(document);
  const versions = getLeaseVersions(document);
  const activeVersion = getActiveLeaseVersion(document);
  const completedVersion = getLatestCompletedLeaseVersion(document);
  const isManager = isManagerRole(viewerRole);
  const canSend = isManager && shouldAllowNewEnvelope(document);
  const canRefresh = Boolean(activeVersion);
  const canContinue = !isManager && Boolean(activeVersion);
  const tenantName = document.tenant?.full_name ?? document.tenant?.email ?? "Unknown tenant";
  const lastUpdated = document.updated_at ?? activeVersion?.updated_at ?? document.created_at ?? null;

  return (
    <Card>
      <CardHeader className="gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-3 text-xl font-semibold">
            {document.title}
            <StatusBadge status={status} />
          </CardTitle>
          <CardDescription className="mt-1 text-sm text-muted-foreground">
            Template <span className="font-medium text-foreground">{document.documenso_template_id}</span>
            {document.tenant ? (
              <>
                {" "}· Tenant <span className="font-medium text-foreground">{tenantName}</span>
              </>
            ) : null}
          </CardDescription>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <p className="text-sm text-muted-foreground">Last updated {formatDate(lastUpdated)}</p>
          <div className="flex flex-wrap gap-2">
            {isManager ? (
              <SendForSignatureButton documentId={document.id} disabled={!canSend} />
            ) : null}
            {canRefresh ? (
              <RefreshStatusButton documentId={document.id} disabled={false} />
            ) : null}
            {canContinue ? (
              <ContinueSigningButton documentId={document.id} disabled={!canContinue} />
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="grid gap-4 rounded-md border bg-muted/50 p-4 text-sm text-muted-foreground sm:grid-cols-2">
          <div>
            <span className="font-medium text-foreground">Active envelope</span>
            <p className="mt-1 break-all text-sm text-muted-foreground">
              {document.active_envelope_id ?? "No active envelope"}
            </p>
          </div>
          <div>
            <span className="font-medium text-foreground">Latest status</span>
            <p className="mt-1 text-sm text-muted-foreground">
              {STATUS_LABELS[status]} (synced {formatDate(document.updated_at)})
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-base font-semibold">Lease versions</h3>
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No Documenso envelopes have been created for this document yet.
            </p>
          ) : (
            <div className="space-y-4">
              {versions.map((version) => {
                const signers = parseSigners(version.signers);
                const downloadUrl = `/api/documents/${document.id}/download?leaseVersion=${version.id}`;
                const canDownload = version.status === "completed";

                return (
                  <div
                    key={version.id}
                    className="space-y-3 rounded-md border p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground">
                          Version {version.version}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Envelope {version.documenso_envelope_id}
                        </span>
                      </div>
                      <StatusBadge status={version.status} />
                    </div>
                    <dl className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                      <div>
                        <dt className="font-medium text-foreground">Sent</dt>
                        <dd>{formatDate(version.sent_at)}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">Completed</dt>
                        <dd>{formatDate(version.completed_at)}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">Expires</dt>
                        <dd>{formatDate(version.expires_at)}</dd>
                      </div>
                    </dl>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Signers</h4>
                      <SignerList signers={signers} />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {isManager ? (
                        <RefreshStatusButton
                          documentId={document.id}
                          disabled={false}
                          label="Sync version"
                        />
                      ) : null}
                      {canDownload ? (
                        <Link
                          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                          href={downloadUrl}
                        >
                          <FileDown className="size-4" /> Download signed PDF
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Signed copy will be available once the envelope is completed.
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {completedVersion ? (
          <section className="rounded-md border border-dashed p-4 text-sm">
            <p className="flex items-center gap-2">
              <FileDown className="size-4 text-muted-foreground" />
              <Link
                className="font-medium text-primary hover:underline"
                href={`/api/documents/${document.id}/download?leaseVersion=${completedVersion.id}`}
              >
                Download latest signed copy
              </Link>
            </p>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}
