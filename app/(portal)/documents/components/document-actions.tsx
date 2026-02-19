'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DocumentWithLease } from '@/types/documents';
import { signDocumentAction, createSigningRequestAction, getSigningUrlAction, getDocumentAccessUrlAction } from '../actions';
import { DocumentViewerDialog } from './document-viewer-dialog';
import { CreateSignatureDialog } from './create-signature-dialog';
import { useDocumentPermissions } from '@/hooks/use-document-permissions';
import { MoreHorizontal, Eye, PenTool, Download, Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface DocumentActionsProps {
  document: DocumentWithLease;
}

export function DocumentActions({ document }: DocumentActionsProps) {
  const [showViewer, setShowViewer] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const permissions = useDocumentPermissions();

  const handleView = async () => {
    const accessResult = await getDocumentAccessUrlAction(document.id, 'view');
    if (accessResult.success && accessResult.data?.url) {
      setShowViewer(true);
      return;
    }

    toast.error(accessResult.error || 'Failed to open document');
  };

  const handleSign = async () => {
    setLoading('signing');
    try {
      // If we have an external signing flow via Documenso, open it
      const urlResult = await getSigningUrlAction(document.id);
      if (urlResult.success && urlResult.data?.signing_url) {
        window.open(urlResult.data.signing_url, '_blank');
        setLoading(null);
        return;
      }

      // Fallback: mark as signed locally (only if URL not available)
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
  };

  const handleCreateSigningRequest = () => {
    setShowSignatureDialog(true);
  };

  const handleDownload = async () => {
    const accessResult = await getDocumentAccessUrlAction(document.id, 'download');
    if (accessResult.success && accessResult.data?.url) {
      window.open(accessResult.data.url, '_blank', 'noopener,noreferrer');
      return;
    }

    toast.error(accessResult.error || 'Download unavailable');
  };

  const handleShare = async () => {
    const accessResult = await getDocumentAccessUrlAction(document.id, 'view');
    if (!accessResult.success || !accessResult.data?.url) {
      toast.error(accessResult.error || 'Share link unavailable');
      return;
    }

    if (navigator.share) {
      navigator.share({
        title: document.title,
        url: accessResult.data.url,
      });
      return;
    }

    navigator.clipboard.writeText(accessResult.data.url);
    toast.success('Secure document URL copied to clipboard');
  };

  // Permission checks
  const canView = permissions.canViewDocument(document);
  const canSign = permissions.canSignDocument(document);
  const canCreateSignature = permissions.canCreateSigningRequests &&
    document.status === 'draft' &&
    document.requires_signature;
  const canEdit = permissions.canEditDocument(document);

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
