"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DocumentWithLease } from "@/types/documents";
import { Download, ExternalLink, FileText } from "lucide-react";
import { format } from "date-fns";

interface DocumentPreviewContentProps {
  document: DocumentWithLease;
}

export function DocumentPreviewContent({ document }: DocumentPreviewContentProps) {
  const downloadHref = document.file_url ?? undefined;

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: "secondary",
      pending_signature: "outline",
      signed: "default",
      expired: "destructive",
      cancelled: "secondary",
    } as const;

    const labels = {
      draft: "Draft",
      pending_signature: "Pending Signature",
      signed: "Signed",
      expired: "Expired",
      cancelled: "Cancelled",
    } as const;

    const variant = variants[status as keyof typeof variants] ?? "secondary";
    const label = labels[status as keyof typeof labels] ?? status;

    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <div className="flex h-full flex-col">
      <header className="border-b px-6 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold leading-tight md:text-2xl">
              {document.title}
            </h1>
            {document.description && (
              <p className="text-sm text-muted-foreground md:text-base">
                {document.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {getStatusBadge(document.status)}
            {downloadHref && (
              <Button variant="outline" size="sm" asChild>
                <a href={downloadHref} target="_blank" rel="noreferrer">
                  <Download className="mr-2 size-4" />
                  Download
                </a>
              </Button>
            )}
            {document.file_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={document.file_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 size-4" />
                  Open
                </a>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <section className="mb-6 rounded-lg bg-muted/50 p-4">
          <div className="grid gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="font-medium text-muted-foreground">Type</p>
              <p className="capitalize">{document.document_type}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Created</p>
              <p>{format(new Date(document.created_at), "MMM d, yyyy")}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Last Updated</p>
              <p>{format(new Date(document.updated_at), "MMM d, yyyy")}</p>
            </div>
            {document.expires_at && (
              <div>
                <p className="font-medium text-muted-foreground">Expires</p>
                <p>{format(new Date(document.expires_at), "MMM d, yyyy")}</p>
              </div>
            )}
          </div>

          {document.lease && (
            <div className="mt-4 border-t pt-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Lease Information
              </h2>
              <div className="grid gap-4 text-sm md:grid-cols-4">
                {document.lease.start_date && (
                  <div>
                    <p className="font-medium text-muted-foreground">Start Date</p>
                    <p>{format(new Date(document.lease.start_date), "MMM d, yyyy")}</p>
                  </div>
                )}
                {document.lease.end_date && (
                  <div>
                    <p className="font-medium text-muted-foreground">End Date</p>
                    <p>{format(new Date(document.lease.end_date), "MMM d, yyyy")}</p>
                  </div>
                )}
                {document.lease.rent_amount && (
                  <div>
                    <p className="font-medium text-muted-foreground">Rent</p>
                    <p>
                      ${document.lease.rent_amount} {document.lease.rent_frequency}
                    </p>
                  </div>
                )}
                {document.lease.tenant_ids && (
                  <div>
                    <p className="font-medium text-muted-foreground">Tenants</p>
                    <p>{document.lease.tenant_ids.length}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {document.signatures && document.signatures.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Signatures
              </h2>
              <div className="space-y-2">
                {document.signatures.map((signature) => (
                  <div
                    key={signature.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{signature.signer_name || signature.signer_email}</span>
                    <Badge
                      variant={
                        signature.status === "signed" ? "default" : "outline"
                      }
                      className="text-xs"
                    >
                      {signature.status === "signed"
                        ? `Signed ${
                            signature.signed_at
                              ? format(new Date(signature.signed_at), "MMM d")
                              : ""
                          }`
                        : signature.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="min-h-[60vh]">
          {document.file_url ? (
            <div className="h-[600px] w-full overflow-hidden rounded-lg border">
              {document.file_url.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={`${document.file_url}#toolbar=0&navpanes=0&scrollbar=0`}
                  className="size-full"
                  title={document.title}
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-muted/20">
                  <div className="text-center">
                    <FileText className="mx-auto mb-4 size-16 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      Preview not available for this file type.
                    </p>
                    {downloadHref && (
                      <Button variant="outline" asChild>
                        <a href={downloadHref} target="_blank" rel="noreferrer">
                          <Download className="mr-2 size-4" />
                          Download to View
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-[600px] items-center justify-center rounded-lg bg-muted/20">
              <div className="text-center">
                <FileText className="mx-auto mb-4 size-16 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Document file not available.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
