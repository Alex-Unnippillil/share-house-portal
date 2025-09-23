'use client';

import { useCallback, useMemo, useState } from 'react';
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
import { uploadDocumentAction, createDocumentDraftFromTemplateAction } from '../actions';
import { useDocumentPermissions } from '@/hooks/use-document-permissions';
import { Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { DocumentTemplateGallery } from './document-template-gallery';
import {
  applyTemplateToFormState,
  buildDraftPayloadFromTemplate,
  createEmptyUploadDocumentFormState,
  resolveTemplateSelection,
  type UploadDocumentFormState,
} from './template-helpers';
import type { DocumentTemplate } from '@/types/documents';

export function UploadDocumentDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<UploadDocumentFormState>(
    () => createEmptyUploadDocumentFormState()
  );
  const [file, setFile] = useState<File | null>(null);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const router = useRouter();
  const permissions = useDocumentPermissions();

  const handleDialogOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      setFormData(createEmptyUploadDocumentFormState());
      setSelectedTemplateId(null);
      setFile(null);
    }
  }, []);

  const handleTemplatesLoaded = useCallback((items: DocumentTemplate[]) => {
    setTemplates(items);
  }, []);

  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) {
      return null;
    }

    return templates.find((template) => template.id === selectedTemplateId) ?? null;
  }, [selectedTemplateId, templates]);

  // Don't render upload button if user doesn't have permission
  if (!permissions.canUploadDocuments) {
    return null;
  }

  const handleTemplateSelect = async (templateId: string) => {
    let shouldResetLoading = false;

    try {
      const template = resolveTemplateSelection(templates, templateId);

      if (template.autoCreateDraft) {
        shouldResetLoading = true;
        setLoading(true);

        const payload = buildDraftPayloadFromTemplate(template);

        try {
          const result = await createDocumentDraftFromTemplateAction(payload);

          if (result.success) {
            toast.success('Draft created from template');
            handleDialogOpenChange(false);
            router.refresh();
          } else {
            toast.error(result.error ?? 'Failed to create draft from template');
          }
        } catch (error) {
          console.error('Failed to create draft from template', error);
          toast.error('Unable to create draft from the selected template');
        }

        return;
      }

      const nextForm = applyTemplateToFormState({
        template,
        currentForm: formData,
      });

      setFormData(nextForm);
      setSelectedTemplateId(templateId);
      toast.success(`Applied "${template.title}" template`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to apply template';
      toast.error(message);
    } finally {
      if (shouldResetLoading) {
        setLoading(false);
      }
    }
  };

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
      if (formData.documenso_template_id) {
        submitData.append('documenso_template_id', formData.documenso_template_id);
      }

      const result = await uploadDocumentAction(submitData);

      if (result.success) {
        toast.success('Document uploaded successfully');
        handleDialogOpenChange(false);
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
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
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
          <DocumentTemplateGallery
            disabled={loading}
            selectedTemplateId={selectedTemplateId}
            onTemplateSelect={handleTemplateSelect}
            onTemplatesLoaded={handleTemplatesLoaded}
          />

          {selectedTemplate ? (
            <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
              Prefilling from "{selectedTemplate.title}". You can adjust the fields before uploading.
            </div>
          ) : null}

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
              onClick={() => handleDialogOpenChange(false)}
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
