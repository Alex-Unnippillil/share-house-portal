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
import {
  signDocumentAction,
  createSigningRequestAction,
  getSigningUrlAction,
  publishDocumentAction,
  unpublishDocumentAction,
  rollbackDocumentAction,
} from '../actions';
import { DocumentViewerDialog } from './document-viewer-dialog';
import { CreateSignatureDialog } from './create-signature-dialog';
import { useDocumentPermissions } from '@/hooks/use-document-permissions';
import { shareDocument } from '@/lib/share/outbound';
import {
  MoreHorizontal,
  Eye,
  PenTool,
  Download,
  Share2,
  Rocket,
  Undo2,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

interface DocumentActionsProps {
  document: DocumentWithLease;
}

export function DocumentActions({ document }: DocumentActionsProps) {
  const [showViewer, setShowViewer] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const permissions = useDocumentPermissions();

  const handleView = () => {
    setShowViewer(true);
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

  const handleDownload = () => {
    if (document.file_url) {
      window.open(document.file_url, '_blank');
    }
  };

  const handleShare = async () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : undefined
    try {
      const status = await shareDocument(document, { baseUrl })

      if (status === 'shared') {
        toast.success('Document shared successfully')
      } else if (status === 'copied') {
        toast.success('Document URL copied to clipboard')
      } else if (status === 'unsupported') {
        toast.error('Sharing is not supported on this device')
      }
    } catch (error) {
      console.error('Error sharing document:', error)
      toast.error('Unable to share document')
    }
  };

  // Permission checks
  const canView = permissions.canViewDocument(document);
  const canSign = permissions.canSignDocument(document);
  const canCreateSignature =
    permissions.canCreateSigningRequests &&
    document.state === 'published' &&
    document.requires_signature;
  const canEdit = permissions.canEditDocument(document);
  const previousVersion = document.versions?.find(
    version => version.version < document.version
  );

  const handlePublish = async () => {
    setLoading('publishing');
    try {
      const result = await publishDocumentAction(document.id);
      if (result.success) {
        toast.success('Document published');
        window.location.reload();
      } else {
        toast.error(result.error || 'Failed to publish document');
      }
    } catch (error) {
      console.error('Error publishing document:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(null);
    }
  };

  const handleUnpublish = async () => {
    setLoading('unpublishing');
    try {
      const result = await unpublishDocumentAction(document.id);
      if (result.success) {
        toast.success('Document returned to draft');
        window.location.reload();
      } else {
        toast.error(result.error || 'Failed to unpublish document');
      }
    } catch (error) {
      console.error('Error unpublishing document:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(null);
    }
  };

  const handleRollback = async () => {
    if (!previousVersion) {
      return;
    }

    setLoading('rollback');
    try {
      const result = await rollbackDocumentAction({
        documentId: document.id,
        targetVersion: previousVersion.version,
      });
      if (result.success) {
        toast.success('Document restored to previous version');
        window.location.reload();
      } else {
        toast.error(result.error || 'Failed to restore document');
      }
    } catch (error) {
      console.error('Error rolling back document:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(null);
    }
  };

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

          {canEdit && document.state === 'draft' && (
            <DropdownMenuItem
              onClick={handlePublish}
              disabled={loading === 'publishing'}
            >
              <Rocket className="mr-2 size-4" />
              {loading === 'publishing' ? 'Publishing...' : 'Publish'}
            </DropdownMenuItem>
          )}

          {canEdit && document.state === 'published' && (
            <DropdownMenuItem
              onClick={handleUnpublish}
              disabled={loading === 'unpublishing'}
            >
              <Undo2 className="mr-2 size-4" />
              {loading === 'unpublishing' ? 'Unpublishing...' : 'Unpublish'}
            </DropdownMenuItem>
          )}

          {canEdit && previousVersion && (
            <DropdownMenuItem
              onClick={handleRollback}
              disabled={loading === 'rollback'}
            >
              <RotateCcw className="mr-2 size-4" />
              {loading === 'rollback' ? 'Restoring...' : 'Restore Previous Version'}
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
