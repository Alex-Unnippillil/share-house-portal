'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState, type ClipboardEvent as ReactClipboardEvent } from 'react';
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
import { Upload, FileText, X } from 'lucide-react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { uploadDocumentAction } from '../actions';
import { useDocumentPermissions } from '@/hooks/use-document-permissions';

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'image/jpeg': ['.jpeg', '.jpg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
} as const;

const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_FILE_MESSAGE = 'Supported formats: PDF, Word, or image files up to 10MB.';

type FileError = {
  name: string;
  message: string;
};

const formatRejectionError = (error: FileRejection['errors'][number], file: File): string => {
  switch (error.code) {
    case 'file-invalid-type':
      return `${file.name} is not an accepted file type. ${ACCEPTED_FILE_MESSAGE}`;
    case 'file-too-large':
      return `${file.name} exceeds the 10MB limit.`;
    case 'too-many-files':
      return `Only one file can be uploaded at a time. Please remove ${file.name} and try again.`;
    default:
      return error.message;
  }
};

const isAcceptedFileType = (file: File) => {
  if (file.type && Object.prototype.hasOwnProperty.call(ACCEPTED_FILE_TYPES, file.type)) {
    return true;
  }

  const lowerName = file.name?.toLowerCase() ?? '';
  return ACCEPTED_EXTENSIONS.some(ext => lowerName.endsWith(ext));
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  const precision = exponent === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[exponent]}`;
};

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileErrors, setFileErrors] = useState<FileError[]>([]);
  const router = useRouter();
  const permissions = useDocumentPermissions();

  const acceptConfig = useMemo(() => ({ ...ACCEPTED_FILE_TYPES }), []);

  const resetFileState = useCallback(() => {
    setPreviewUrl(prev => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    setFile(null);
    setFileErrors([]);
  }, []);

  useEffect(() => {
    if (!open) {
      resetFileState();
    }
  }, [open, resetFileState]);

  // Don't render upload button if user doesn't have permission
  if (!permissions.canUploadDocuments) {
    return null;
  }

  const handleAcceptedFile = useCallback((nextFile: File) => {
    setPreviewUrl(prev => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }

      if (nextFile.type.startsWith('image/')) {
        return URL.createObjectURL(nextFile);
      }

      return null;
    });
    setFile(nextFile);
  }, []);

  const handleDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    const errors: FileError[] = fileRejections.flatMap(rejection =>
      rejection.errors.map(error => ({
        name: rejection.file.name,
        message: formatRejectionError(error, rejection.file),
      }))
    );

    if (acceptedFiles.length > 0) {
      handleAcceptedFile(acceptedFiles[0]);
    }

    setFileErrors(errors);
  }, [handleAcceptedFile]);

  const validatePastedFiles = useCallback((files: File[]): { accepted: File | null; errors: FileError[] } => {
    const errors: FileError[] = [];
    let accepted: File | null = null;

    files.forEach((item, index) => {
      if (!isAcceptedFileType(item)) {
        errors.push({
          name: item.name || `Pasted file ${index + 1}`,
          message: `${item.name || 'This file'} is not an accepted file type. ${ACCEPTED_FILE_MESSAGE}`,
        });
        return;
      }

      if (item.size > MAX_FILE_SIZE_BYTES) {
        errors.push({
          name: item.name || `Pasted file ${index + 1}`,
          message: `${item.name || 'This file'} exceeds the 10MB limit.`,
        });
        return;
      }

      if (accepted) {
        errors.push({
          name: item.name || `Pasted file ${index + 1}`,
          message: `Only one file can be uploaded at a time. Please remove ${item.name || 'this file'} and try again.`,
        });
        return;
      }

      accepted = item;
    });

    return { accepted, errors };
  }, []);

  const handlePaste = useCallback((event: ReactClipboardEvent<HTMLDivElement>) => {
    const pastedFiles = Array.from(event.clipboardData?.files ?? []);
    if (pastedFiles.length === 0) {
      return;
    }

    event.preventDefault();

    const { accepted, errors } = validatePastedFiles(pastedFiles);
    if (accepted) {
      handleAcceptedFile(accepted);
    }

    setFileErrors(errors);
  }, [handleAcceptedFile, validatePastedFiles]);

  const { getRootProps, getInputProps, isDragActive, open: openFileDialog } = useDropzone({
    accept: acceptConfig,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE_BYTES,
    multiple: true,
    onDrop: handleDrop,
  });

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
        resetFileState();
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
            <div
              {...getRootProps({
                className: cn(
                  'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition',
                  isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                ),
                tabIndex: 0,
                role: 'button',
                'aria-label': 'Document upload area',
                'data-testid': 'document-dropzone',
              })}
              onPaste={handlePaste}
            >
              <input
                {...getInputProps({
                  id: 'file',
                  name: 'file',
                })}
              />
              {file ? (
                <div className="flex w-full flex-col items-center gap-3">
                  {previewUrl ? (
                    <div className="relative h-40 w-full overflow-hidden rounded-md border bg-muted">
                      <Image
                        src={previewUrl}
                        alt={`Preview of ${file.name}`}
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <FileText className="size-12 text-muted-foreground" />
                  )}
                  <div className="flex w-full flex-col items-center gap-1 text-sm">
                    <span className="font-medium text-foreground">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      resetFileState();
                    }}
                    className="flex items-center gap-1"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="size-4" />
                    Remove file
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <FileText className="size-12" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Drag &amp; drop, paste, or click to upload</p>
                    <p className="text-xs">{ACCEPTED_FILE_MESSAGE}</p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      openFileDialog();
                    }}
                  >
                    Browse files
                  </Button>
                </div>
              )}
            </div>
            {fileErrors.length > 0 && (
              <ul className="space-y-1 text-xs text-destructive">
                {fileErrors.map((error, index) => (
                  <li key={`${error.name}-${index}`}>{error.message}</li>
                ))}
              </ul>
            )}
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
