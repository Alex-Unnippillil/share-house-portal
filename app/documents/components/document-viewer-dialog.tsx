'use client';

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentWithLease } from '@/types/documents';
import { Download, ExternalLink, FileText, History, ShieldCheck } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface DocumentViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentWithLease;
}

export function DocumentViewerDialog({
  open,
  onOpenChange,
  document
}: DocumentViewerDialogProps) {
  const handleDownload = () => {
    if (document.file_url) {
      window.open(document.file_url, '_blank');
    }
  };

  const handleOpenExternal = () => {
    if (document.file_url) {
      window.open(document.file_url, '_blank');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'secondary',
      pending_signature: 'outline',
      signed: 'default',
      expired: 'destructive',
      cancelled: 'secondary',
    } as const;

    const labels = {
      draft: 'Draft',
      pending_signature: 'Pending Signature',
      signed: 'Signed',
      expired: 'Expired',
      cancelled: 'Cancelled',
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const metadata = document.metadata ?? {};
  const versionHistory = useMemo(
    () => buildVersionHistory(document),
    [document]
  );

  const auditTrail = useMemo(
    () => buildAuditTrail(document),
    [document]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden">
        <DialogHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl">{document.title}</DialogTitle>
              {document.description && (
                <p className="text-sm text-muted-foreground">{document.description}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {getStatusBadge(document.status)}
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                <ShieldCheck className="size-3" />
                Version {document.version ?? 1}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="mr-2 size-4" />
                Download
              </Button>
              <Button variant="outline" size="sm" onClick={handleOpenExternal}>
                <ExternalLink className="mr-2 size-4" />
                Open
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex h-full flex-1 flex-col overflow-hidden">
          <TabsList className="mb-4 w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history" className="inline-flex items-center gap-2">
              <History className="size-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 flex-1 overflow-hidden">
            <div className="flex flex-col gap-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                  <div>
                    <span className="font-medium text-muted-foreground">Type:</span>
                    <p className="capitalize">{document.document_type}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Created:</span>
                    <p>{format(new Date(document.created_at), 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Last Updated:</span>
                    <p>{format(new Date(document.updated_at), 'MMM d, yyyy')}</p>
                  </div>
                  {document.expires_at && (
                    <div>
                      <span className="font-medium text-muted-foreground">Expires:</span>
                      <p>{format(new Date(document.expires_at), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                </div>

                {document.lease && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="mb-2 font-medium">Lease Information</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                      {document.lease.start_date && (
                        <div>
                          <span className="font-medium text-muted-foreground">Start Date:</span>
                          <p>{format(new Date(document.lease.start_date), 'MMM d, yyyy')}</p>
                        </div>
                      )}
                      {document.lease.end_date && (
                        <div>
                          <span className="font-medium text-muted-foreground">End Date:</span>
                          <p>{format(new Date(document.lease.end_date), 'MMM d, yyyy')}</p>
                        </div>
                      )}
                      {document.lease.rent_amount && (
                        <div>
                          <span className="font-medium text-muted-foreground">Rent:</span>
                          <p>${document.lease.rent_amount} {document.lease.rent_frequency}</p>
                        </div>
                      )}
                      {document.lease.tenant_ids && (
                        <div>
                          <span className="font-medium text-muted-foreground">Tenants:</span>
                          <p>{document.lease.tenant_ids.length}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {document.signatures && document.signatures.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="mb-2 font-medium">Signatures</h4>
                    <div className="space-y-2">
                      {document.signatures.map((signature) => (
                        <div key={signature.id} className="flex items-center justify-between text-sm">
                          <span>{signature.signer_name || signature.signer_email}</span>
                          <Badge
                            variant={signature.status === 'signed' ? 'default' : 'outline'}
                            className="text-xs"
                          >
                            {signature.status === 'signed'
                              ? `Signed ${signature.signed_at ? format(new Date(signature.signed_at), 'MMM d') : ''}`
                              : signature.status
                            }
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="min-h-0 flex-1">
                {document.file_url ? (
                  <div className="h-[600px] w-full overflow-hidden rounded-lg border">
                    {document.file_url.toLowerCase().endsWith('.pdf') ? (
                      <iframe
                        src={`${document.file_url}#toolbar=0&navpanes=0&scrollbar=0`}
                        className="size-full"
                        title={document.title}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-muted/20">
                        <div className="text-center">
                          <FileText className="mx-auto mb-4 size-16 text-muted-foreground" />
                          <p className="mb-2 text-muted-foreground">
                            Preview not available for this file type
                          </p>
                          <Button onClick={handleDownload} variant="outline">
                            <Download className="mr-2 size-4" />
                            Download to View
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-[600px] items-center justify-center rounded-lg bg-muted/20">
                    <div className="text-center">
                      <FileText className="mx-auto mb-4 size-16 text-muted-foreground" />
                      <p className="text-muted-foreground">Document file not available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-0 flex-1 overflow-hidden">
            <DocumentHistoryPanel
              versionHistory={versionHistory}
              auditTrail={auditTrail}
              metadata={metadata}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

type VersionHistoryEntry = {
  versionLabel: string;
  summary: string;
  timestamp?: string | null;
  formattedTimestamp?: string;
  relativeTimestamp?: string;
  actor?: string;
  details?: string;
  isCurrent?: boolean;
};

type AuditTrailEntry = {
  id: string;
  action: string;
  timestamp?: string | null;
  formattedTimestamp?: string;
  relativeTimestamp?: string;
  actor?: string;
  metadataBadges: { label: string; value: string }[];
  description?: string;
};

function DocumentHistoryPanel({
  versionHistory,
  auditTrail,
  metadata,
}: {
  versionHistory: VersionHistoryEntry[];
  auditTrail: AuditTrailEntry[];
  metadata: Record<string, any>;
}) {
  const additionalNotes = extractHistoryNotes(metadata);

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      {additionalNotes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Change Policy Notes</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {additionalNotes}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid h-full gap-4 lg:grid-cols-2">
        <Card className="flex min-h-0 flex-col">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-base font-semibold">Version timeline</CardTitle>
            <CardDescription className="text-xs">
              Track how this document evolved across revisions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            {versionHistory.length > 0 ? (
              <ScrollArea className="h-full pr-4">
                <ol className="relative space-y-6 border-l border-border/60 pl-6">
                  {versionHistory.map((entry, index) => (
                    <li key={`${entry.versionLabel}-${index}`} className="relative pl-2">
                      <span
                        className={`absolute left-[-0.75rem] top-2 flex size-3 items-center justify-center rounded-full border bg-background ${entry.isCurrent ? 'border-primary' : 'border-border/70'}`}
                      >
                        <span className={`size-1.5 rounded-full ${entry.isCurrent ? 'bg-primary' : 'bg-muted-foreground/60'}`} />
                      </span>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{entry.versionLabel}</span>
                        <span className="flex flex-col text-right">
                          {entry.formattedTimestamp && (
                            <span>{entry.formattedTimestamp}</span>
                          )}
                          {entry.relativeTimestamp && (
                            <span className="text-[11px] text-muted-foreground/70">{entry.relativeTimestamp}</span>
                          )}
                        </span>
                      </div>

                      <p className="mt-1 text-sm font-medium text-foreground">{entry.summary}</p>

                      {entry.actor && (
                        <p className="text-xs text-muted-foreground">Updated by {entry.actor}</p>
                      )}

                      {entry.details && (
                        <p className="mt-2 text-xs text-muted-foreground">{entry.details}</p>
                      )}
                    </li>
                  ))}
                </ol>
              </ScrollArea>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                No version history has been recorded yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-col">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-base font-semibold">Audit trail</CardTitle>
            <CardDescription className="text-xs">
              Every view, download, and signature request is captured for compliance.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            {auditTrail.length > 0 ? (
              <ScrollArea className="h-full pr-4">
                <ol className="relative space-y-6 border-l border-border/60 pl-6">
                  {auditTrail.map((entry) => (
                    <li key={entry.id} className="relative pl-2">
                      <span className="absolute left-[-0.75rem] top-2 flex size-3 items-center justify-center rounded-full border border-border/70 bg-background">
                        <span className="size-1.5 rounded-full bg-primary/70" />
                      </span>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-medium capitalize text-foreground">{entry.action.replace(/_/g, ' ')}</span>
                        <span className="flex flex-col text-right">
                          {entry.formattedTimestamp && <span>{entry.formattedTimestamp}</span>}
                          {entry.relativeTimestamp && (
                            <span className="text-[11px] text-muted-foreground/70">{entry.relativeTimestamp}</span>
                          )}
                        </span>
                      </div>

                      {entry.actor && (
                        <p className="text-xs text-muted-foreground">Performed by {entry.actor}</p>
                      )}

                      {entry.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{entry.description}</p>
                      )}

                      {entry.metadataBadges.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {entry.metadataBadges.map((badge) => (
                            <Badge key={`${entry.id}-${badge.label}`} variant="outline" className="text-[11px]">
                              <span className="font-medium capitalize">{badge.label}:</span>
                              <span className="ml-1 text-muted-foreground">{badge.value}</span>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </ScrollArea>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                No audit activity has been recorded for this document yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function buildVersionHistory(document: DocumentWithLease): VersionHistoryEntry[] {
  const metadata = (document.metadata ?? {}) as Record<string, any>;
  const rawHistory = Array.isArray(metadata.version_history)
    ? metadata.version_history as Record<string, any>[]
    : [];

  const entries: VersionHistoryEntry[] = rawHistory.map((entry, index) => {
    const timestamp = extractTimestamp(entry) ?? document.updated_at;
    const versionNumber = extractVersionNumber(entry, index, document.version ?? rawHistory.length || 1);

    return {
      versionLabel: `Version ${versionNumber ?? '—'}`,
      summary: extractSummary(entry) ?? 'Document updated',
      timestamp,
      formattedTimestamp: formatTimestamp(timestamp),
      relativeTimestamp: formatRelativeTimestamp(timestamp),
      actor: extractActor(entry) ?? undefined,
      details: extractDetails(entry) ?? undefined,
      isCurrent: (versionNumber ?? document.version) === document.version,
    };
  });

  if (!entries.some((entry) => entry.isCurrent)) {
    const timestamp = document.updated_at;
    entries.unshift({
      versionLabel: `Version ${document.version ?? 1}`,
      summary: metadata.last_change_summary || 'Latest revision published',
      timestamp,
      formattedTimestamp: formatTimestamp(timestamp),
      relativeTimestamp: formatRelativeTimestamp(timestamp),
      actor: extractActor(metadata.last_modified_by) ?? extractActor(metadata.updated_by) ?? undefined,
      details: extractDetails(metadata.last_change_details) ?? undefined,
      isCurrent: true,
    });
  }

  entries.push({
    versionLabel: 'Version 1',
    summary: metadata.creation_summary || 'Document created',
    timestamp: document.created_at,
    formattedTimestamp: formatTimestamp(document.created_at),
    relativeTimestamp: formatRelativeTimestamp(document.created_at),
    actor: extractActor(metadata.created_by) ?? undefined,
    details: extractDetails(metadata.creation_details) ?? undefined,
    isCurrent: document.version === 1,
  });

  const unique = new Map<string, VersionHistoryEntry>();
  for (const entry of entries) {
    const key = `${entry.versionLabel}-${entry.timestamp}-${entry.summary}`;
    if (!unique.has(key)) {
      unique.set(key, entry);
    }
  }

  return Array.from(unique.values()).sort((a, b) => {
    const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    if (aTime === bTime) {
      return (b.versionLabel.localeCompare(a.versionLabel));
    }
    return bTime - aTime;
  });
}

function buildAuditTrail(document: DocumentWithLease): AuditTrailEntry[] {
  const accessLogs = Array.isArray(document.access_logs) ? document.access_logs : [];

  return accessLogs
    .map((log) => {
      const metadata = (log.metadata ?? {}) as Record<string, any>;
      const timestamp = log.created_at ?? extractTimestamp(metadata);

      return {
        id: log.id,
        action: log.action,
        timestamp,
        formattedTimestamp: formatTimestamp(timestamp),
        relativeTimestamp: formatRelativeTimestamp(timestamp),
        actor:
          extractActor(metadata) ||
          metadata.actor_name ||
          metadata.user_name ||
          metadata.performed_by ||
          metadata.owner ||
          undefined,
        metadataBadges: extractMetadataBadges(metadata),
        description: extractSummary(metadata) ?? undefined,
      };
    })
    .sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    });
}

function formatTimestamp(timestamp?: string | null) {
  if (!timestamp) return undefined;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return undefined;
  return format(date, 'MMM d, yyyy • h:mm a');
}

function formatRelativeTimestamp(timestamp?: string | null) {
  if (!timestamp) return undefined;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return undefined;
  return formatDistanceToNow(date, { addSuffix: true });
}

function extractActor(entry: any): string | undefined {
  if (!entry) return undefined;
  if (typeof entry === 'string') return entry;
  if (typeof entry === 'object') {
    return (
      entry.name ||
      entry.full_name ||
      entry.email ||
      entry.username ||
      entry.actor ||
      entry.actor_name ||
      (typeof entry.first_name === 'string' && typeof entry.last_name === 'string'
        ? `${entry.first_name} ${entry.last_name}`
        : undefined)
    );
  }
  return undefined;
}

function extractSummary(entry: any): string | undefined {
  if (!entry || typeof entry !== 'object') return undefined;
  return (
    entry.summary ||
    entry.change_summary ||
    entry.changes ||
    entry.description ||
    entry.notes ||
    entry.reason ||
    entry.message
  );
}

function extractDetails(entry: any): string | undefined {
  if (!entry) return undefined;
  if (typeof entry === 'string') return entry;
  if (typeof entry !== 'object') return undefined;
  return entry.details || entry.delta || entry.diff || undefined;
}

function extractTimestamp(entry: any): string | undefined {
  if (!entry) return undefined;
  if (typeof entry === 'string') return entry;
  if (typeof entry !== 'object') return undefined;
  return (
    entry.changed_at ||
    entry.updated_at ||
    entry.created_at ||
    entry.timestamp ||
    entry.at ||
    entry.occurred_at
  );
}

function extractVersionNumber(entry: Record<string, any>, index: number, fallback: number) {
  if (!entry) return fallback;
  if (typeof entry.version === 'number') return entry.version;
  if (typeof entry.version === 'string') {
    const parsed = parseInt(entry.version, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  if (typeof entry.revision === 'number') return entry.revision;
  if (typeof entry.revision === 'string') {
    const parsed = parseInt(entry.revision, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback - index;
}

function extractMetadataBadges(metadata: Record<string, any>) {
  if (!metadata) return [] as { label: string; value: string }[];
  const entries = Object.entries(metadata)
    .filter(([key, value]) =>
      key !== 'summary' &&
      key !== 'description' &&
      key !== 'details' &&
      key !== 'change_summary' &&
      typeof value !== 'object'
    )
    .slice(0, 6);

  return entries.map(([label, value]) => ({
    label,
    value: String(value),
  }));
}

function extractHistoryNotes(metadata: Record<string, any>): string | null {
  if (!metadata) return null;
  if (typeof metadata.history_notes === 'string') return metadata.history_notes;
  if (typeof metadata.retention_policy === 'string') return metadata.retention_policy;
  return null;
}
