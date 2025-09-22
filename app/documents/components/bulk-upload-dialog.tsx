'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { bulkUploadDocumentsAction } from '../actions';
import { useDocumentPermissions } from '@/hooks/use-document-permissions';
import { createClient } from '@/utils/supabase-browser';
import type { DocumentType } from '@/types/documents';
import { toast } from 'sonner';
import { FolderPlus, Upload, Users, Shield, X } from 'lucide-react';

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface ResidentOption {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

type PermissionScope = 'property_staff' | 'all_residents' | 'custom_residents';

type ResidentsStatus = 'idle' | 'loading' | 'loaded' | 'error';

export function BulkUploadDialog() {
  const permissions = useDocumentPermissions();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [documentType, setDocumentType] = useState<DocumentType>('other');
  const [requiresSignature, setRequiresSignature] = useState(false);
  const [titlePrefix, setTitlePrefix] = useState('');
  const [description, setDescription] = useState('');
  const [permissionScope, setPermissionScope] = useState<PermissionScope>('all_residents');
  const [selectedResidentIds, setSelectedResidentIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [residentsStatus, setResidentsStatus] = useState<ResidentsStatus>('idle');
  const [residents, setResidents] = useState<ResidentOption[]>([]);

  useEffect(() => {
    if (permissionScope !== 'custom_residents') {
      setSelectedResidentIds([]);
    }
  }, [permissionScope]);

  const loadResidents = useCallback(async () => {
    try {
      setResidentsStatus('loading');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setResidentsStatus('error');
        toast.error('You must be signed in to manage residents.');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .in('role', ['tenant', 'roommate'])
        .order('full_name', { ascending: true });

      if (error) {
        throw error;
      }

      setResidents((data as ResidentOption[] | null | undefined) ?? []);
      setResidentsStatus('loaded');
    } catch (error) {
      console.error('Error loading residents for bulk permissions:', error);
      setResidentsStatus('error');
      toast.error('Failed to load residents. Please try again.');
    }
  }, []);

  useEffect(() => {
    if (open && residentsStatus === 'idle') {
      loadResidents();
    }
  }, [open, residentsStatus, loadResidents]);

  const resetForm = useCallback(() => {
    setFiles([]);
    setDocumentType('other');
    setRequiresSignature(false);
    setTitlePrefix('');
    setDescription('');
    setPermissionScope('all_residents');
    setSelectedResidentIds([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length === 0) return;

    const nextFiles: File[] = [...files];
    const existingKeys = new Set(nextFiles.map(file => `${file.name}-${file.size}`));

    for (const file of selectedFiles) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name} is not a supported file type.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is larger than 10MB.`);
        continue;
      }

      const key = `${file.name}-${file.size}`;
      if (existingKeys.has(key)) {
        continue;
      }

      existingKeys.add(key);
      nextFiles.push(file);
    }

    setFiles(nextFiles);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const toggleResident = (residentId: string) => {
    setSelectedResidentIds(prev =>
      prev.includes(residentId)
        ? prev.filter(id => id !== residentId)
        : [...prev, residentId]
    );
  };

  const selectAllResidents = () => {
    if (residents.length === 0) return;
    if (selectedResidentIds.length === residents.length) {
      setSelectedResidentIds([]);
    } else {
      setSelectedResidentIds(residents.map(resident => resident.id));
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (files.length === 0) {
      toast.error('Please select at least one document to upload.');
      return;
    }

    if (permissionScope === 'custom_residents' && selectedResidentIds.length === 0) {
      toast.error('Select at least one resident to share these documents with.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('document_type', documentType);
      formData.append('requires_signature', requiresSignature.toString());
      formData.append('permission_scope', permissionScope);
      if (titlePrefix.trim()) {
        formData.append('title_prefix', titlePrefix.trim());
      }
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      if (permissionScope === 'custom_residents') {
        formData.append('shared_member_ids', JSON.stringify(selectedResidentIds));
      }

      const result = await bulkUploadDocumentsAction(formData);

      if (result.success) {
        toast.success(result.message || 'Documents uploaded successfully.');
        resetForm();
        setOpen(false);
        router.refresh();
      } else if (result.data?.created?.length) {
        const failureCount = result.data.failed.length;
        toast.warning(
          result.message || `Uploaded ${result.data.created.length} documents, ${failureCount} failed.`
        );
        resetForm();
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to upload documents.');
      }
    } catch (error) {
      console.error('Error completing bulk document upload:', error);
      toast.error('An unexpected error occurred while uploading documents.');
    } finally {
      setSubmitting(false);
    }
  };

  const formattedResidents = useMemo(() => {
    return residents.map(resident => ({
      ...resident,
      displayName: resident.full_name || resident.email || 'Unknown member',
      roleLabel: resident.role
        ? resident.role.replace(/_/g, ' ').replace(/^\w/, char => char.toUpperCase())
        : null,
    }));
  }, [residents]);

  if (!permissions.canUploadDocuments) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <FolderPlus className="mr-2 size-4" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bulk document upload</DialogTitle>
          <DialogDescription>
            Add multiple files at once and apply consistent permissions to every document.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="bulk-files">Document files</Label>
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 text-center">
              <input
                ref={fileInputRef}
                id="bulk-files"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
              />
              <label htmlFor="bulk-files" className="flex cursor-pointer flex-col items-center space-y-2">
                <Upload className="size-10 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  Drag and drop files or <span className="font-semibold text-primary">browse</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Supports PDF, Word, and image files up to 10MB each.
                </p>
              </label>
            </div>
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm"
                  >
                    <div className="space-y-0.5 text-left">
                      <p className="font-medium text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeFile(index)}
                    >
                      <X className="size-4" />
                      <span className="sr-only">Remove {file.name}</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Permission scope</Label>
                <Select
                  value={permissionScope}
                  onValueChange={(value) => setPermissionScope(value as PermissionScope)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_residents">
                      <div className="flex items-center space-x-2">
                        <Users className="size-4" />
                        <span>All tenants and roommates</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="property_staff">
                      <div className="flex items-center space-x-2">
                        <Shield className="size-4" />
                        <span>Property managers &amp; admins</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="custom_residents">
                      <div className="flex items-center space-x-2">
                        <FolderPlus className="size-4" />
                        <span>Custom selection</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose who should immediately receive access to every uploaded document.
                </p>
              </div>

              {permissionScope === 'custom_residents' && (
                <div className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Select residents</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={residents.length === 0 || residentsStatus === 'loading'}
                      onClick={selectAllResidents}
                    >
                      {selectedResidentIds.length === residents.length && residents.length > 0
                        ? 'Clear selection'
                        : 'Select all'}
                    </Button>
                  </div>
                  {residentsStatus === 'loading' && (
                    <p className="text-sm text-muted-foreground">Loading residents…</p>
                  )}
                  {residentsStatus === 'error' && (
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>We couldn’t load residents right now.</p>
                      <Button type="button" variant="outline" size="sm" onClick={loadResidents}>
                        Try again
                      </Button>
                    </div>
                  )}
                  {residentsStatus === 'loaded' && residents.length === 0 && (
                    <p className="text-sm text-muted-foreground">No residents available to select.</p>
                  )}
                  {residentsStatus === 'loaded' && residents.length > 0 && (
                    <ScrollArea className="h-48">
                      <div className="space-y-2 pr-2">
                        {formattedResidents.map(resident => {
                          const checkboxId = `resident-${resident.id}`;
                          return (
                            <label
                              key={resident.id}
                              htmlFor={checkboxId}
                              className="flex cursor-pointer items-start justify-between rounded-md border bg-background px-3 py-2"
                            >
                              <div className="space-y-1 pr-3">
                                <p className="text-sm font-medium text-foreground">{resident.displayName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {resident.email}
                                  {resident.roleLabel ? ` • ${resident.roleLabel}` : ''}
                                </p>
                              </div>
                              <Checkbox
                                id={checkboxId}
                                checked={selectedResidentIds.includes(resident.id)}
                                onCheckedChange={() => toggleResident(resident.id)}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="document-type">Document type</Label>
                <Select value={documentType} onValueChange={value => setDocumentType(value as DocumentType)}>
                  <SelectTrigger id="document-type">
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

              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div className="space-y-1">
                  <Label htmlFor="requires-signature" className="text-sm font-medium">
                    Requires signature
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Mark documents as needing signatures from recipients.
                  </p>
                </div>
                <Switch
                  id="requires-signature"
                  checked={requiresSignature}
                  onCheckedChange={setRequiresSignature}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title-prefix">Title prefix</Label>
                <Input
                  id="title-prefix"
                  value={titlePrefix}
                  onChange={event => setTitlePrefix(event.target.value)}
                  placeholder="Optional prefix added before each file name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulk-description">Description</Label>
                <Textarea
                  id="bulk-description"
                  value={description}
                  onChange={event => setDescription(event.target.value)}
                  placeholder="Shared description for every document"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>{files.length} file{files.length === 1 ? '' : 's'} ready to upload</span>
            {permissionScope === 'custom_residents' ? (
              <span>
                {selectedResidentIds.length} recipient{selectedResidentIds.length === 1 ? '' : 's'} selected
              </span>
            ) : (
              <span>Scope: {scopeLabel(permissionScope)}</span>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || files.length === 0}>
              {submitting ? 'Uploading…' : 'Upload documents'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${size} B`;
}

function scopeLabel(scope: PermissionScope) {
  switch (scope) {
    case 'property_staff':
      return 'Property staff';
    case 'custom_residents':
      return 'Custom recipients';
    default:
      return 'All tenants & roommates';
  }
}
