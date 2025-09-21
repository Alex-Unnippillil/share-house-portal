import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LeaseSummary,
  LeaseDocumentSummary,
  formatLeaseDocumentStatus,
  canTransitionLeaseDocumentStatus,
} from "@/lib/lease-documents";
import {
  downloadLeaseDocument,
  refreshLeaseDocumentStatus,
  requestLeaseSignature,
} from "../actions";

type LeaseCardProps = {
  lease: LeaseSummary;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function LeaseCard({ lease }: LeaseCardProps) {
  const assignment = lease.assignment;

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold">{lease.title}</CardTitle>
            <CardDescription>
              {assignment
                ? `You are listed as ${assignment.role}${assignment.isPrimary ? " (primary)" : ""}.`
                : "You do not currently have an assignment for this lease."}
            </CardDescription>
          </div>
          {assignment ? (
            <Badge variant={assignment.isPrimary ? "default" : "outline"}>{assignment.role}</Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {lease.effectiveDate
            ? `Effective ${formatDate(lease.effectiveDate)}`
            : "Effective date pending"}
          {assignment?.signedAt ? ` • Signed ${formatDateTime(assignment.signedAt)}` : ""}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {lease.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No documents have been shared for this lease yet.
          </p>
        ) : (
          lease.documents.map((document) => (
            <LeaseDocumentItem key={document.id} document={document} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

type LeaseDocumentItemProps = {
  document: LeaseDocumentSummary;
};

function LeaseDocumentItem({ document }: LeaseDocumentItemProps) {
  const statusVariant = getStatusVariant(document.status);
  const canRequest = canTransitionLeaseDocumentStatus(document.status, "awaiting_signature");
  const showEmbed = Boolean(document.signingEmbedUrl) && document.status === "awaiting_signature";

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold leading-6">{document.name}</h3>
          <p className="text-sm text-muted-foreground">
            {document.requestedAt
              ? `Requested ${formatDateTime(document.requestedAt)}`
              : "Signature request has not been sent."}
            {document.completedAt ? ` • Completed ${formatDateTime(document.completedAt)}` : ""}
          </p>
        </div>
        <Badge variant={statusVariant}>{formatLeaseDocumentStatus(document.status)}</Badge>
      </div>
      {showEmbed ? (
        <div className="overflow-hidden rounded-md border bg-muted/20">
          <iframe
            title={`${document.name} signing session`}
            src={document.signingEmbedUrl ?? undefined}
            className="h-[480px] w-full"
            allow="fullscreen"
            loading="lazy"
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {document.status === "completed"
            ? "This document has been fully executed."
            : "A signing session will be available once a request has been issued."}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <form action={refreshLeaseDocumentStatus}>
          <input type="hidden" name="documentId" value={document.id} />
          <Button type="submit" variant="outline" size="sm">
            Sync status
          </Button>
        </form>
        <form action={requestLeaseSignature}>
          <input type="hidden" name="documentId" value={document.id} />
          <Button type="submit" size="sm" disabled={!canRequest}>
            {document.status === "awaiting_signature" ? "Signature requested" : "Request signature"}
          </Button>
        </form>
        {document.storagePath ? (
          <form action={downloadLeaseDocument}>
            <input type="hidden" name="documentId" value={document.id} />
            <Button type="submit" size="sm" variant="secondary">
              Download signed PDF
            </Button>
          </form>
        ) : document.documensoDownloadUrl ? (
          <Button asChild size="sm" variant="secondary">
            <a href={document.documensoDownloadUrl} target="_blank" rel="noopener noreferrer">
              Download from Documenso
            </a>
          </Button>
        ) : null}
        {document.lastSyncedAt ? (
          <span className="text-xs text-muted-foreground">
            Last synced {formatDateTime(document.lastSyncedAt)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function getStatusVariant(
  status: LeaseDocumentSummary["status"],
): "default" | "secondary" | "destructive" | "outline" | "complete" {
  switch (status) {
    case "completed":
      return "complete";
    case "declined":
    case "cancelled":
      return "destructive";
    case "awaiting_signature":
      return "secondary";
    case "draft":
    default:
      return "outline";
  }
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateFormatter.format(date);
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateTimeFormatter.format(date);
}
