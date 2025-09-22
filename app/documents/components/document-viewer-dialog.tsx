'use client';


import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentWithLease } from '@/types/documents';
import { Download, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const PDF_WORKER_URL = new URL('../../../workers/pdf-viewer.worker.ts', import.meta.url);
const DEFAULT_RENDER_SCALE = 1.5;

type PdfWorkerMessage =
  | { type: 'loaded'; payload: { numPages: number } }
  | { type: 'progress'; payload: { loaded: number; total?: number } }
  | { type: 'page'; payload: { pageNumber: number; width: number; height: number }; imageBitmap: ImageBitmap }
  | { type: 'error'; payload: { message: string } }
  | { type: 'released' };

type PdfWorkerRequest =
  | { type: 'load'; payload: { url: string; credentials?: RequestCredentials } }
  | { type: 'renderPage'; payload: { pageNumber: number; scale?: number } }
  | { type: 'release' };

interface RenderedPage {
  pageNumber: number;
  width: number;
  height: number;
  bitmap: ImageBitmap | null;
  rendered: boolean;
}

interface PdfViewerProps {
  src: string;
  open: boolean;
}

function PdfPage({ page, onRendered }: { page: RenderedPage; onRendered: (pageNumber: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { bitmap, height, pageNumber, width } = page;

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !bitmap) {
      return;
    }

    canvas.width = Math.ceil(width);
    canvas.height = Math.ceil(height);

    const context = canvas.getContext('2d', { alpha: false });

    if (!context) {
      bitmap.close();
      onRendered(pageNumber);
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    onRendered(pageNumber);
  }, [bitmap, height, onRendered, pageNumber, width]);

  return (
    <canvas
      ref={canvasRef}
      className="mb-4 w-full rounded border bg-white shadow-sm last:mb-0 dark:bg-zinc-950"
      style={{ aspectRatio: `${width} / ${height}` }}
    />
  );
}

function PdfViewer({ open, src }: PdfViewerProps) {
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const nextPageRef = useRef(1);
  const totalPagesRef = useRef(0);
  const pagesRef = useRef<RenderedPage[]>([]);

  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  const handleRendered = useCallback((pageNumber: number) => {
    setPages((prev) =>
      prev.map((page) =>
        page.pageNumber === pageNumber ? { ...page, bitmap: null, rendered: true } : page,
      ),
    );
  }, []);

  const renderedCount = useMemo(
    () => pages.reduce((total, page) => (page.rendered ? total + 1 : total), 0),
    [pages],
  );

  useEffect(() => {
    if (!open) {
      setPages([]);
      setIsLoading(false);
      setProgress(null);
      setNumPages(null);
      setError(null);
      return undefined;
    }

    if (!src.toLowerCase().endsWith('.pdf')) {
      setPages([]);
      setIsLoading(false);
      setProgress(null);
      setNumPages(null);
      setError('Preview is only available for PDF documents.');
      return undefined;
    }

    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      setPages([]);
      setIsLoading(false);
      setProgress(null);
      setNumPages(null);
      setError('PDF preview is not supported in this environment.');
      return undefined;
    }

    let cancelled = false;
    let worker: Worker;

    try {
      worker = new Worker(PDF_WORKER_URL, { type: 'module' });
    } catch (workerError) {
      console.error('Failed to initialise PDF worker', workerError);
      setError('Unable to initialise the PDF preview worker.');
      setIsLoading(false);
      return undefined;
    }

    workerRef.current = worker;
    setPages([]);
    setError(null);
    setProgress(null);
    setNumPages(null);
    setIsLoading(true);
    nextPageRef.current = 1;
    totalPagesRef.current = 0;

    const handleMessage = (event: MessageEvent<PdfWorkerMessage>) => {
      const message = event.data;

      if (cancelled) {
        if ('imageBitmap' in message) {
          message.imageBitmap.close();
        }
        return;
      }

      switch (message.type) {
        case 'loaded': {
          totalPagesRef.current = message.payload.numPages;
          setNumPages(message.payload.numPages);

          if (message.payload.numPages > 0) {
            const nextPage = nextPageRef.current;
            worker.postMessage({
              type: 'renderPage',
              payload: { pageNumber: nextPage, scale: DEFAULT_RENDER_SCALE },
            } satisfies PdfWorkerRequest);
            nextPageRef.current = nextPage + 1;
          } else {
            setIsLoading(false);
          }
          break;
        }
        case 'progress': {
          if (typeof message.payload.total === 'number' && message.payload.total > 0) {
            setProgress(Math.round((message.payload.loaded / message.payload.total) * 100));
          }
          break;
        }
        case 'page': {
          setIsLoading(false);
          const { height, pageNumber, width } = message.payload;
          const bitmap = message.imageBitmap;

          setPages((prev) => {
            const existingIndex = prev.findIndex((page) => page.pageNumber === pageNumber);
            if (existingIndex !== -1) {
              const next = [...prev];
              next[existingIndex] = { pageNumber, width, height, bitmap, rendered: false };
              return next;
            }

            const next = [...prev, { pageNumber, width, height, bitmap, rendered: false }];
            next.sort((a, b) => a.pageNumber - b.pageNumber);
            return next;
          });

          if (nextPageRef.current <= totalPagesRef.current) {
            const nextPage = nextPageRef.current;
            worker.postMessage({
              type: 'renderPage',
              payload: { pageNumber: nextPage, scale: DEFAULT_RENDER_SCALE },
            } satisfies PdfWorkerRequest);
            nextPageRef.current = nextPage + 1;
          }
          break;
        }
        case 'error': {
          pagesRef.current.forEach((page) => page.bitmap?.close());
          setPages([]);
          setError(message.payload.message);
          setIsLoading(false);
          break;
        }
        case 'released': {
          break;
        }
      }
    };

    worker.addEventListener('message', handleMessage);

    worker.postMessage({ type: 'load', payload: { url: src } } satisfies PdfWorkerRequest);

    return () => {
      cancelled = true;
      pagesRef.current.forEach((page) => page.bitmap?.close());
      worker.removeEventListener('message', handleMessage);
      worker.postMessage({ type: 'release' } satisfies PdfWorkerRequest);
      worker.terminate();
      workerRef.current = null;
      setPages([]);
      setIsLoading(false);
      setProgress(null);
      setNumPages(null);
    };
  }, [open, src]);

  const renderingProgress = useMemo(() => {
    if (!numPages || numPages === 0) {
      return null;
    }

    return Math.round((renderedCount / numPages) * 100);
  }, [numPages, renderedCount]);

  return (
    <div className="flex h-[600px] flex-col overflow-hidden rounded-lg border bg-background">
      <div className="border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
        {error ? (
          <span>{error}</span>
        ) : numPages ? (
          <span>
            Rendering {renderedCount} of {numPages} pages
            {typeof renderingProgress === 'number' ? ` (${renderingProgress}%)` : ''}
          </span>
        ) : progress !== null ? (
          <span>Fetching document… {progress}%</span>
        ) : (
          <span>Preparing document preview…</span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto bg-muted/10 p-4">
        {error ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Unable to display document preview.
          </div>
        ) : isLoading && pages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center space-y-3 text-sm text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
            <span>Rendering first page…</span>
          </div>
        ) : pages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No preview available.
          </div>
        ) : (
          pages.map((page) => <PdfPage key={page.pageNumber} page={page} onRendered={handleRendered} />)
        )}
      </div>
    </div>
  );
}

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
              document.file_url.toLowerCase().endsWith('.pdf') ? (
                <PdfViewer key={document.id} open={open} src={document.file_url} />
              ) : (
                <div className="flex h-[600px] items-center justify-center rounded-lg border bg-muted/20">
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
              )
            ) : (
              <div className="flex h-[600px] items-center justify-center rounded-lg border bg-muted/20">
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
