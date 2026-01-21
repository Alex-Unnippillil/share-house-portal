'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { uploadDocumentAction } from '../actions';
import { useDocumentPermissions } from '@/hooks/use-document-permissions';
import { Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { documentUploadSchema, type DocumentUploadFormValues } from '../actions/schemas';

export function UploadDocumentDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const permissions = useDocumentPermissions();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const defaultValues: Partial<DocumentUploadFormValues> = {
    title: '',
    description: '',
    document_type: 'other',
    tenant_id: undefined,
    unit_id: undefined,
    requires_signature: false,
    expires_at: '',
  };

  const form = useForm<DocumentUploadFormValues>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues,
  });

  const { isSubmitting } = form.formState;

  const resetFormState = () => {
    form.reset({
      ...defaultValues,
      file: undefined as unknown as DocumentUploadFormValues['file'],
    });
    form.clearErrors();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Don't render upload button if user doesn't have permission
  if (!permissions.canUploadDocuments) {
    return null;
  }

  const handleDialogChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetFormState();
    }
  };

  const onSubmit = async (values: DocumentUploadFormValues) => {
    try {
      const submitData = new FormData();
      submitData.append('file', values.file);
      submitData.append('title', values.title);
      if (values.description) {
        submitData.append('description', values.description);
      }
      submitData.append('document_type', values.document_type);
      if (values.tenant_id) {
        submitData.append('tenant_id', values.tenant_id);
      }
      if (values.unit_id) {
        submitData.append('unit_id', values.unit_id);
      }
      submitData.append('requires_signature', values.requires_signature ? 'true' : 'false');
      if (values.expires_at) {
        submitData.append('expires_at', values.expires_at);
      }

      const result = await uploadDocumentAction(submitData);

      if (result.success) {
        toast.success('Document uploaded successfully');
        setOpen(false);
        resetFormState();
        router.refresh();
      } else {
        if (result.fieldErrors) {
          (Object.entries(result.fieldErrors) as [keyof DocumentUploadFormValues, string[] | undefined][])
            .forEach(([field, messages]) => {
              const message = messages?.[0];
              if (message) {
                form.setError(field, { type: 'server', message });
              }
            });
        }
        toast.error(result.error || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('An unexpected error occurred');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="document-file">Document File *</FormLabel>
                  <FormControl>
                    <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center">
                      <input
                        id="document-file"
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                        className="hidden"
                        ref={(node) => {
                          field.ref(node);
                          fileInputRef.current = node;
                        }}
                        onBlur={field.onBlur}
                        onChange={(event) => {
                          const selectedFile = event.target.files?.[0];
                          field.onChange(selectedFile);
                        }}
                      />
                      <label htmlFor="document-file" className="cursor-pointer">
                        <FileText className="mx-auto mb-2 size-12 text-muted-foreground" />
                        <div className="text-sm text-muted-foreground">
                          {field.value instanceof File ? (
                            <span className="font-medium text-foreground">{field.value.name}</span>
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
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Lease Agreement - Unit 2A"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="Optional description of the document"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="document_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="lease">Lease Agreement</SelectItem>
                      <SelectItem value="addendum">Addendum</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requires_signature"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      id="requires_signature"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel htmlFor="requires_signature" className="text-sm">
                      Requires signature
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expires_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiry Date (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Uploading...' : 'Upload Document'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
