'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentWithLease } from '@/types/documents';
import { Download, ExternalLink, FileText, History } from 'lucide-react';
import { format } from 'date-fns';
import { getDocumentAccessUrlAction } from '../actions';
import { toast } from 'sonner';

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
  const [signedViewUrl, setSignedViewUrl] = useState<string | null>(null);

  useEffect(() => {
    const prepareViewUrl = async () => {
      if (!open) return;
      const result = await getDocumentAccessUrlAction(document.id, 'view');
      if (result.success && result.data?.url) {
        setSignedViewUrl(result.data.url);
      }
    };

    void prepareViewUrl();
  }, [document.id, open]);

  const handleDownload = async () => {
    const result = await getDocumentAccessUrlAction(document.id, 'download');
    if (result.success && result.data?.url) {
      window.open(result.data.url, '_blank', 'noopener,noreferrer');
      return;
    }

    toast.error(result.error || 'Download unavailable');
  };

  const handleOpenExternal = async () => {
    const result = await getDocumentAccessUrlAction(document.id, 'view');
    if (result.success && result.data?.url) {
      window.open(result.data.url, '_blank', 'noopener,noreferrer');
      return;
    }

    toast.error(result.error || 'Unable to open document');
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

  const metadata = (document.metadata || {}) as Record<string, string | number | undefined>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-hidden">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">{document.title}</DialogTitle>
              {document.description && (
                <p className="text-sm text-muted-foreground">{document.description}</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge(document.status)}
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

        <div className="flex-1 overflow-hidden">
          <div className="mb-4 rounded-lg bg-muted/50 p-4">
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <span className="font-medium text-muted-foreground">Type:</span>
                <p className="capitalize">{document.document_type.replace('_', ' ')}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Created:</span>
                <p>{format(new Date(document.created_at), 'MMM d, yyyy')}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Last Updated:</span>
                <p>{format(new Date(document.updated_at), 'MMM d, yyyy')}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Version:</span>
                <p>v{document.version || 1}</p>
              </div>
              {document.expires_at && (
                <div>
                  <span className="font-medium text-muted-foreground">Expires:</span>
                  <p>{format(new Date(document.expires_at), 'MMM d, yyyy')}</p>
                </div>
              )}
              <div>
                <span className="font-medium text-muted-foreground">Source:</span>
                <p>{(metadata.source as string) || 'tenant_portal'}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Uploaded by:</span>
                <p>{(metadata.uploader_email as string) || 'Unknown'}</p>
              </div>
            </div>

            {document.parent_document_id && (
              <div className="mt-4 rounded-md border bg-background p-3 text-sm">
                <div className="mb-1 flex items-center gap-2 font-medium">
                  <History className="size-4" />
                  Version history
                </div>
                <p className="text-muted-foreground">
                  This file is version {document.version || 1} and supersedes document #{document.parent_document_id.slice(0, 8)}.
                </p>
                {metadata.version_notes && (
                  <p className="mt-2 text-muted-foreground">Notes: {String(metadata.version_notes)}</p>
                )}
              </div>
            )}

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
                </div>
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1">
            {signedViewUrl ? (
              <div className="h-[600px] w-full overflow-hidden rounded-lg border">
                <iframe
                  src={`${signedViewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                  className="size-full"
                  title={document.title}
                />
              </div>
            ) : (
              <div className="flex h-[600px] items-center justify-center rounded-lg bg-muted/20">
                <div className="text-center">
                  <FileText className="mx-auto mb-4 size-16 text-muted-foreground" />
                  <p className="text-muted-foreground">Preparing secure preview...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
