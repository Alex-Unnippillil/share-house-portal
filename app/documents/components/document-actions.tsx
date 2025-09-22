'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DocumentWithLease } from '@/types/documents';
import { signDocumentAction, getSigningUrlAction } from '../actions';
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
  const queryClient = useQueryClient();

  const signDocumentMutation = useMutation({
    mutationFn: async ({ documentId }: { documentId: string }) => {
      const result = await signDocumentAction(documentId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to sign document');
      }
      return { documentId };
    },
    onMutate: async ({ documentId }) => {
      await queryClient.cancelQueries({ queryKey: ['documents'] });
      const previousDocuments = queryClient.getQueriesData<DocumentWithLease[]>({ queryKey: ['documents'] });
      const optimisticSignedAt = new Date().toISOString();

      const snapshots = previousDocuments.map(([queryKey, data]) => {
        const nextData = data?.map((doc) => {
          if (doc.id !== documentId) {
            return doc;
          }

          const updatedSignatures = doc.signatures?.map((signature) => {
            if (permissions.userId && signature.signer_id === permissions.userId) {
              return {
                ...signature,
                status: 'signed',
                signed_at: optimisticSignedAt,
              };
            }
            return signature;
          });

          const allSigned = updatedSignatures?.every((signature) => signature.status === 'signed') ?? false;

          return {
            ...doc,
            signatures: updatedSignatures,
            status: allSigned ? 'signed' : doc.status,
            signed_at: allSigned ? optimisticSignedAt : doc.signed_at,
          };
        }) ?? data;

        queryClient.setQueryData(queryKey, nextData);

        return { queryKey, data };
      });

      return { snapshots };
    },
    onError: (error, _variables, context) => {
      context?.snapshots?.forEach(({ queryKey, data }) => {
        queryClient.setQueryData(queryKey, data);
      });
      toast.error(error instanceof Error ? error.message : 'Failed to sign document');
    },
    onSuccess: () => {
      toast.success('Document signed successfully');
    },
    onSettled: () => {
      setLoading(null);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

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
      signDocumentMutation.mutate({ documentId: document.id });
    } catch (error) {
      console.error('Error initiating signing:', error);
      toast.error('An unexpected error occurred');
      setLoading(null);
      return;
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

  const handleShare = () => {
    if (navigator.share && document.file_url) {
      navigator.share({
        title: document.title,
        url: document.file_url,
      });
    } else {
      // Fallback: copy URL to clipboard
      navigator.clipboard.writeText(document.file_url || '');
      toast.success('Document URL copied to clipboard');
    }
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
