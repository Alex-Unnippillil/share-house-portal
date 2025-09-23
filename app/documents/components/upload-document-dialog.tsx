'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useDocumentPermissions } from '@/hooks/use-document-permissions';
import { Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useUploadDocumentMutation } from '@/hooks/use-document-mutations';
import type { DocumentWithLease } from '@/types/documents';

void React;

export function UploadDocumentDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    document_type: 'other' as const,
    tenant_id: '',
    unit_id: '',
    requires_signature: false,
    expires_at: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [optimisticMessage, setOptimisticMessage] = useState<string | null>(null);
  const router = useRouter();
  const permissions = useDocumentPermissions();

  const uploadMutation = useUploadDocumentMutation({
    onOptimistic: () => {
      setOptimisticMessage('Document uploaded successfully. Syncing with server...');
    },
    onRollback: (error) => {
      setOptimisticMessage(null);
      const message =
        error instanceof Error ? error.message : 'Failed to upload document';
      toast.error(message);
    },
    onConfirmed: () => {
      setOptimisticMessage('Document upload synced successfully.');
    },
  });

  const isSubmitting = uploadMutation.isPending;

  // Don't render upload button if user doesn't have permission
  if (!permissions.canUploadDocuments) {
    return null;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (!allowedTypes.includes(selectedFile.type)) {
        toast.error('Please select a valid file type (PDF, Word, or image)');
        return;
      }

      // Validate file size (10MB max)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Please enter a document title');
      return;
    }

    try {
      const submitData = new FormData();
      submitData.append('file', file);
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('document_type', formData.document_type);
      submitData.append('tenant_id', formData.tenant_id);
      submitData.append('unit_id', formData.unit_id);
      submitData.append('requires_signature', formData.requires_signature.toString());
      submitData.append('expires_at', formData.expires_at);

      const optimisticDocument = buildOptimisticDocument({
        formData,
        file,
      });

      await uploadMutation.mutateAsync(
        {
          formData: submitData,
          optimisticDocument,
        },
        {
          onSuccess: () => {
            toast.success('Document uploaded successfully');
            setOpen(false);
            setFormData({
              title: '',
              description: '',
              document_type: 'other',
              tenant_id: '',
              unit_id: '',
              requires_signature: false,
              expires_at: '',
            });
            setFile(null);
            router.refresh();
            setOptimisticMessage(null);
          },
        },
      );
    } catch (error) {
      console.error('Error uploading document:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 size-4" />
          Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a new document to your Roomsily hub. Files are securely stored and instantly shareable with every roommate.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {optimisticMessage && (
            <div className="rounded-md border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
              {optimisticMessage}
            </div>
          )}

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file">Document File</Label>
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center">
              <input
                id="file"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                className="hidden"
              />
              <label htmlFor="file" className="cursor-pointer">
                <FileText className="mx-auto mb-2 size-12 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  {file ? (
                    <span className="font-medium text-foreground">{file.name}</span>
                  ) : (
                    <>
                      Click to select a file or drag and drop
                      <br />
                      <span className="text-xs">PDF, Word, or image files up to 10MB</span>
                    </>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Document Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Lease Agreement - Unit 2A"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description of the document"
              rows={2}
            />
          </div>

          {/* Document Type */}
          <div className="space-y-2">
            <Label htmlFor="document_type">Document Type</Label>
            <Select
              value={formData.document_type}
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, document_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lease">Lease Agreement</SelectItem>
                <SelectItem value="addendum">Addendum</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Signature Required */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="requires_signature"
              checked={formData.requires_signature}
              onCheckedChange={(checked) =>
                setFormData(prev => ({ ...prev, requires_signature: checked as boolean }))
              }
            />
            <Label htmlFor="requires_signature" className="text-sm">
              Requires signature
            </Label>
          </div>

          {/* Expiry Date */}
          <div className="space-y-2">
            <Label htmlFor="expires_at">Expiry Date (Optional)</Label>
            <Input
              id="expires_at"
              type="datetime-local"
              value={formData.expires_at}
              onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !file}>
              {isSubmitting ? 'Uploading...' : 'Upload Document'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function buildOptimisticDocument({
  formData,
  file,
}: {
  formData: {
    title: string;
    description: string;
    document_type: DocumentWithLease['document_type'];
    tenant_id: string;
    unit_id: string;
    requires_signature: boolean;
    expires_at: string;
  };
  file: File;
}): DocumentWithLease {
  const timestamp = new Date().toISOString();
  const optimisticId = `temp-${timestamp}`;

  return {
    id: optimisticId,
    created_at: timestamp,
    updated_at: timestamp,
    title: formData.title,
    description: formData.description,
    document_type: formData.document_type,
    status: formData.requires_signature ? 'pending_signature' : 'draft',
    file_url: undefined,
    documenso_envelope_id: undefined,
    documenso_template_id: undefined,
    metadata: {
      optimistic: true,
      originalFileName: file.name,
    },
    created_by: undefined,
    property_id: undefined,
    tenant_id: formData.tenant_id || undefined,
    unit_id: formData.unit_id || undefined,
    requires_signature: formData.requires_signature,
    expires_at: formData.expires_at || undefined,
    signed_at: undefined,
    version: 1,
    parent_document_id: undefined,
    lease: undefined,
    signatures: [],
  };
}
