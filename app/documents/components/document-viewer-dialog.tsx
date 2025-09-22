'use client';

import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentWithLease } from '@/types/documents';
import { Download, ExternalLink, FileText } from 'lucide-react';
import { format } from 'date-fns';

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
  const metadata = document.metadata ?? null;
  const contentType = typeof metadata?.content_type === 'string' ? metadata.content_type : null;
  const previewUrl = typeof metadata?.preview_url === 'string' && metadata.preview_url
    ? metadata.preview_url
    : null;
  const thumbnailUrl = typeof metadata?.thumbnail_url === 'string' && metadata.thumbnail_url
    ? metadata.thumbnail_url
    : null;
  const sizeBytes = typeof metadata?.size_bytes === 'number' ? metadata.size_bytes : null;
  const isImageContent = !!contentType && contentType.startsWith('image/');
  const isPdf = contentType === 'application/pdf' || document.file_url?.toLowerCase().endsWith('.pdf');
  const previewGenerating = isImageContent && !previewUrl;

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return null;
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }

    return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  };

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

            {(contentType || sizeBytes) && (
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {contentType && (
                  <span className="rounded-full bg-background px-2 py-0.5 font-medium text-muted-foreground">
                    {contentType}
                  </span>
                )}
                {formatFileSize(sizeBytes) && (
                  <span className="rounded-full bg-background px-2 py-0.5">
                    {formatFileSize(sizeBytes)}
                  </span>
                )}
                {thumbnailUrl && (
                  <span className="rounded-full bg-background px-2 py-0.5">
                    Preview ready
                  </span>
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
            {isImageContent && previewUrl && (
              <div className="flex h-[600px] w-full items-center justify-center overflow-hidden rounded-lg border bg-muted/10">
                <Image
                  src={previewUrl}
                  alt={`${document.title} preview`}
                  width={960}
                  height={600}
                  className="size-full object-contain"
                  sizes="(max-width: 768px) 100vw, 960px"
                />
              </div>
            )}

            {previewGenerating && (
              <div className="flex h-[600px] flex-col items-center justify-center rounded-lg border bg-muted/20 text-center">
                <FileText className="mb-4 size-16 text-muted-foreground" />
                <p className="text-muted-foreground">Generating a fresh preview…</p>
                <p className="text-xs text-muted-foreground/80">Refresh in a moment if the thumbnail hasn&apos;t appeared yet.</p>
              </div>
            )}

            {!isImageContent && document.file_url && isPdf && (
              <div className="h-[600px] w-full overflow-hidden rounded-lg border">
                <iframe
                  src={`${document.file_url}#toolbar=0&navpanes=0&scrollbar=0`}
                  className="size-full"
                  title={document.title}
                />
              </div>
            )}

            {!isImageContent && document.file_url && !isPdf && (
              <div className="flex h-[600px] flex-col items-center justify-center rounded-lg border bg-muted/20 text-center">
                <FileText className="mb-4 size-16 text-muted-foreground" />
                <p className="mb-2 text-muted-foreground">
                  Preview not available for this file type
                </p>
                <Button onClick={handleDownload} variant="outline">
                  <Download className="mr-2 size-4" />
                  Download to View
                </Button>
              </div>
            )}

            {!document.file_url && (
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
