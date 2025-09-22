'use client';


import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentWithLease } from '@/types/documents';
import { Download, ExternalLink, FileText } from 'lucide-react';
import { format } from 'date-fns';

import { PdfStreamViewer } from './pdf-stream-viewer';

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
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
          {/* Document Metadata */}
          <div className="mb-4 rounded-lg bg-muted/50 p-4">
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

          {/* Document Preview */}
          <div className="min-h-0 flex-1">
            {document.file_url ? (
              <div className="h-[600px] w-full overflow-hidden rounded-lg border">
                {document.file_url.toLowerCase().endsWith('.pdf') ? (
                  <PdfStreamViewer
                    documentId={document.id}
                    title={document.title}
                    fallbackUrl={document.file_url}
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
      </DialogContent>
    </Dialog>
  );
}
