'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DocumentWithLease } from '@/types/documents';
import { createSigningRequestAction } from '../actions';
import { useDocumentPermissions } from '@/hooks/use-document-permissions';
import { PenTool, Users } from 'lucide-react';
import { toast } from 'sonner';

interface CreateSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentWithLease;
}

export function CreateSignatureDialog({
  open,
  onOpenChange,
  document
}: CreateSignatureDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    signer_email: '',
    signer_name: '',
    message: '',
    expires_in_days: 30,
  });
  const router = useRouter();
  const permissions = useDocumentPermissions();

  // Check if user can create signing requests for this document
  const canCreateSignature = permissions.canCreateSigningRequests &&
    document.status === 'draft' &&
    document.requires_signature;

  if (!canCreateSignature) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.signer_email.trim()) {
      toast.error('Please enter a signer email');
      return;
    }

    if (!formData.signer_name.trim()) {
      toast.error('Please enter a signer name');
      return;
    }

    setLoading(true);
    try {
      const submitData = new FormData();
      submitData.append('document_id', document.id);
      submitData.append('signer_email', formData.signer_email);
      submitData.append('signer_name', formData.signer_name);
      submitData.append('message', formData.message);
      submitData.append('expires_in_days', formData.expires_in_days.toString());

      const result = await createSigningRequestAction(submitData);

      if (result.success) {
        toast.success('Signing request created successfully');
        if (result.fallbackNotice) {
          toast.warning(result.fallbackNotice);
        }
        onOpenChange(false);
        setFormData({
          signer_email: '',
          signer_name: '',
          message: '',
          expires_in_days: 30,
        });
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to create signing request');
      }
    } catch (error) {
      console.error('Error creating signing request:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <PenTool className="size-5" />
            <span>Create Signing Request</span>
          </DialogTitle>
          <DialogDescription>
            Send a signature request for &quot;{document.title}&quot; via Documenso. The signer will receive an email with a link to sign the document.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Signer Email */}
          <div className="space-y-2">
            <Label htmlFor="signer_email">Signer Email *</Label>
            <Input
              id="signer_email"
              type="email"
              value={formData.signer_email}
              onChange={(e) => setFormData(prev => ({ ...prev, signer_email: e.target.value }))}
              placeholder="signer@example.com"
              required
            />
          </div>

          {/* Signer Name */}
          <div className="space-y-2">
            <Label htmlFor="signer_name">Signer Name *</Label>
            <Input
              id="signer_name"
              value={formData.signer_name}
              onChange={(e) => setFormData(prev => ({ ...prev, signer_name: e.target.value }))}
              placeholder="John Doe"
              required
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Please review and sign this document at your earliest convenience."
              rows={3}
            />
          </div>

          {/* Expiry Days */}
          <div className="space-y-2">
            <Label htmlFor="expires_in_days">Request Expires In (Days)</Label>
            <Input
              id="expires_in_days"
              type="number"
              min="1"
              max="365"
              value={formData.expires_in_days}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                expires_in_days: parseInt(e.target.value) || 30
              }))}
            />
          </div>

          {/* Lease-specific information */}
          {document.document_type === 'lease' && document.lease && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
              <div className="flex items-start space-x-2">
                <Users className="mt-0.5 size-4 text-blue-600" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Lease Document
                  </p>
                  <p className="text-blue-700 dark:text-blue-300">
                    This is a lease agreement. For multi-tenant leases, consider creating separate signing requests for each tenant.
                  </p>
                  {document.lease.tenant_ids && document.lease.tenant_ids.length > 1 && (
                    <p className="mt-1 text-blue-600 dark:text-blue-400">
                      This lease has {document.lease.tenant_ids.length} tenants. You may need to send individual requests.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Send Signing Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
