'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DocumentWithLease } from '@/types/documents';
import { signDocumentAction, createSigningRequestAction, getSigningUrlAction } from '../actions';
import { DocumentViewerDialog } from './document-viewer-dialog';
import { CreateSignatureDialog } from './create-signature-dialog';
import { useDocumentPermissions } from '@/hooks/use-document-permissions';
import { MoreHorizontal, Eye, PenTool, Download, Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface DocumentActionsProps {
  document: DocumentWithLease;
}

function DocumentActionsComponent({ document }: DocumentActionsProps) {
  const [showViewer, setShowViewer] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const permissions = useDocumentPermissions();

  const handleView = useCallback(() => {
    setShowViewer(true);
  }, []);

  const handleSign = useCallback(async () => {
    setLoading('signing');
    try {
      const urlResult = await getSigningUrlAction(document.id);
      if (urlResult.success && urlResult.data?.signing_url) {
        window.open(urlResult.data.signing_url, '_blank');
        setLoading(null);
        return;
      }

      const result = await signDocumentAction(document.id);
      if (result.success) {
        toast.success('Document signed successfully');
        window.location.reload();
      } else {
        toast.error(result.error || 'Failed to sign document');
      }
    } catch (error) {
      console.error('Error initiating signing:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(null);
    }
  }, [document.id]);

  const handleCreateSigningRequest = useCallback(() => {
    setShowSignatureDialog(true);
  }, []);

  const handleDownload = useCallback(() => {
    if (document.file_url) {
      window.open(document.file_url, '_blank');
    }
  }, [document.file_url]);

  const handleShare = useCallback(() => {
    if (navigator.share && document.file_url) {
      navigator.share({
        title: document.title,
        url: document.file_url,
      });
    } else {
      navigator.clipboard.writeText(document.file_url || '');
      toast.success('Document URL copied to clipboard');
    }
  }, [document.file_url, document.title]);

  const canView = useMemo(() => permissions.canViewDocument(document), [permissions, document]);
  const canSign = useMemo(() => permissions.canSignDocument(document), [permissions, document]);
  const canCreateSignature = useMemo(
    () => permissions.canCreateSigningRequests && document.status === 'draft' && document.requires_signature,
    [document.requires_signature, document.status, permissions],
  );
  const canEdit = useMemo(() => permissions.canEditDocument(document), [permissions, document]);

  // Don't render anything if user can't view this document
  if (!canView) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleView}>
            <Eye className="mr-2 size-4" />
            View Document
          </DropdownMenuItem>

          {canSign && (
            <DropdownMenuItem onClick={handleSign} disabled={loading === 'signing'}>
              <PenTool className="mr-2 size-4" />
              {loading === 'signing' ? 'Signing...' : 'Sign Document'}
            </DropdownMenuItem>
          )}

          {canCreateSignature && (
            <DropdownMenuItem onClick={handleCreateSigningRequest}>
              <Share2 className="mr-2 size-4" />
              Create Signing Request
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleDownload}>
            <Download className="mr-2 size-4" />
            Download
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleShare}>
            <Share2 className="mr-2 size-4" />
            Share
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialogs */}
      <DocumentViewerDialog
        open={showViewer}
        onOpenChange={setShowViewer}
        document={document}
      />

      <CreateSignatureDialog
        open={showSignatureDialog}
        onOpenChange={setShowSignatureDialog}
        document={document}
      />
    </>
  );
}

export const DocumentActions = memo(
  DocumentActionsComponent,
  (prev, next) => prev.document.id === next.document.id && prev.document.updated_at === next.document.updated_at,
);
