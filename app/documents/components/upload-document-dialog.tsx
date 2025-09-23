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
import { uploadDocumentAction } from '@/app/documents/actions';
import { useDocumentPermissions } from '@/hooks/use-document-permissions';
import { Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';

export function UploadDocumentDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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
  const router = useRouter();
  const permissions = useDocumentPermissions();

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

    setLoading(true);
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

      const result = await uploadDocumentAction(submitData);

      if (result.success) {
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
      } else {
        toast.error(result.error || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
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
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !file}>
              {loading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
