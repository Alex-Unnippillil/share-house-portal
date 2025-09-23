'use client';

import {
  useCallback,
  useEffect,
  useId,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DocumentWithLease, DocumentListFilters } from '@/types/documents';
import {
  bulkDeleteDocumentsAction,
  bulkExportDocumentsAction,
  bulkTagDocumentsAction,
  getDocumentsAction,
} from '../actions';
import { DocumentActions } from './document-actions';
import { formatDistanceToNow } from 'date-fns';
import { FileText, Users, Calendar, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useDocumentPermissions } from '@/hooks/use-document-permissions';
import { useTableSelection } from '@/components/table/use-table-selection';
import { DocumentBulkActionsToolbar } from './document-bulk-actions-toolbar';
import { cn } from '@/lib/utils';

interface DocumentsListProps {
  filter: DocumentListFilters;
}

export function DocumentsList({ filter }: DocumentsListProps) {
  const [documents, setDocuments] = useState<DocumentWithLease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<'delete' | 'update' | 'export' | null>(null);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkForm, setBulkForm] = useState({ unitId: '', tag: '' });
  const permissions = useDocumentPermissions();
  const unitFieldId = useId();
  const tagFieldId = useId();

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getDocumentsAction(filter);
        if (result.success && result.data) {
          setDocuments(result.data);
          setError(null);
        } else {
          setError(result.error || 'Failed to fetch documents');
        }
      } catch (err) {
        console.error('Error fetching documents:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [filter]);

  const getStatusBadge = useCallback((status: string) => {
    const variants = {
      draft: 'secondary',
      pending_signature: 'outline',
      signed: 'default',
      expired: 'destructive',
      cancelled: 'secondary',
    } as const;

    const labels = {
      draft: 'Draft',
      pending_signature: 'Pending Signature',
      signed: 'Signed',
      expired: 'Expired',
      cancelled: 'Cancelled',
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  }, []);

  const getStateBadge = useCallback((state: string) => {
    const labels = {
      draft: 'Draft',
      published: 'Published',
    } as const;

    return (
      <Badge
        variant={state === 'published' ? 'default' : 'secondary'}
        className="uppercase"
      >
        {labels[state as keyof typeof labels] || state}
      </Badge>
    );
  }, []);

  const versionStatusLabel = useCallback((status: string) => {
    const labels = {
      draft: 'Draft Saved',
      pending_signature: 'Sent for Signature',
      signed: 'Signed',
      expired: 'Expired',
      cancelled: 'Cancelled',
    } as const;

    return labels[status as keyof typeof labels] || status;
  }, []);

  const getTypeIcon = useCallback((type: string) => {
    switch (type) {
      case 'lease':
        return <FileText className="size-4" />;
      case 'addendum':
        return <FileText className="size-4" />;
      case 'insurance':
        return <Users className="size-4" />;
      default:
        return <FileText className="size-4" />;
    }
  }, []);

  const getDocumentId = useCallback((doc: DocumentWithLease) => doc.id, []);
  const isDocumentSelectable = useCallback(
    (doc: DocumentWithLease) => permissions.canEditDocument(doc),
    [permissions],
  );

  const {
    selectedIds,
    toggleItem,
    toggleAll,
    isSelected,
    isAllSelected,
    isIndeterminate,
    clearSelection,
    selectableCount,
  } = useTableSelection<DocumentWithLease>({
    items: documents,
    getId: getDocumentId,
    isItemSelectable: isDocumentSelectable,
  });

  const selectedCount = selectedIds.length;
  const headerCheckboxState: boolean | 'indeterminate' = isAllSelected
    ? true
    : isIndeterminate
      ? 'indeterminate'
      : false;

  useEffect(() => {
    if (selectedCount === 0 && showBulkDialog) {
      setShowBulkDialog(false);
    }
  }, [selectedCount, showBulkDialog]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.length === 0) {
      toast.error('Select at least one document to delete.');
      return;
    }

    const ids = [...selectedIds];
    setBulkAction('delete');
    try {
      const result = await bulkDeleteDocumentsAction(ids);
      if (result.success) {
        setDocuments((previous) => previous.filter((doc) => !ids.includes(doc.id)));
        clearSelection();
        toast.success(result.message ?? `Deleted ${ids.length} document${ids.length === 1 ? '' : 's'}.`);
      } else {
        toast.error(result.error || 'Failed to delete documents.');
      }
    } catch (err) {
      console.error('Error deleting documents:', err);
      toast.error('An unexpected error occurred while deleting documents.');
    } finally {
      setBulkAction(null);
    }
  }, [selectedIds, clearSelection]);

  const handleBulkExport = useCallback(async () => {
    if (selectedIds.length === 0) {
      toast.error('Select at least one document to export.');
      return;
    }

    const ids = [...selectedIds];
    setBulkAction('export');
    try {
      const result = await bulkExportDocumentsAction(ids);
      if (result.success) {
        const url = result.data?.export_url ?? result.data?.signed_url;
        if (url && typeof window !== 'undefined') {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
        toast.success(result.message ?? 'Export started for selected documents.');
      } else {
        toast.error(result.error || 'Failed to export documents.');
      }
    } catch (err) {
      console.error('Error exporting documents:', err);
      toast.error('An unexpected error occurred while exporting documents.');
    } finally {
      setBulkAction(null);
    }
  }, [selectedIds]);

  const handleBulkUpdate = useCallback(async () => {
    if (selectedIds.length === 0) {
      toast.error('Select at least one document to update.');
      return;
    }

    const normalizedTag = bulkForm.tag.trim();
    const normalizedUnitId = bulkForm.unitId.trim();

    if (!normalizedTag && !normalizedUnitId) {
      toast.error('Enter a destination unit or tag to apply.');
      return;
    }

    const ids = [...selectedIds];
    setBulkAction('update');
    try {
      const result = await bulkTagDocumentsAction({
        documentIds: ids,
        tag: normalizedTag || undefined,
        unitId: normalizedUnitId || undefined,
      });

      if (result.success) {
        setDocuments((previous) =>
          previous.map((doc) => {
            if (!ids.includes(doc.id)) {
              return doc;
            }

            const nextMetadata = (() => {
              const currentMetadata = (doc.metadata ?? {}) as Record<string, any>;
              if (!normalizedTag) {
                return currentMetadata;
              }

              const existingTags = Array.isArray(currentMetadata.tags)
                ? (currentMetadata.tags as string[])
                : [];

              if (existingTags.includes(normalizedTag)) {
                return currentMetadata;
              }

              return {
                ...currentMetadata,
                tags: [...existingTags, normalizedTag],
              };
            })();

            return {
              ...doc,
              unit_id: normalizedUnitId ? normalizedUnitId : doc.unit_id,
              metadata: nextMetadata,
            };
          }),
        );
        clearSelection();
        setBulkForm({ tag: '', unitId: '' });
        setShowBulkDialog(false);
        toast.success(result.message ?? 'Updates applied to selected documents.');
      } else {
        toast.error(result.error || 'Failed to update documents.');
      }
    } catch (err) {
      console.error('Error applying bulk updates:', err);
      toast.error('An unexpected error occurred while updating documents.');
    } finally {
      setBulkAction(null);
    }
  }, [bulkForm.tag, bulkForm.unitId, clearSelection, selectedIds]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-5 w-48 rounded bg-muted" />
                  <div className="h-4 w-32 rounded bg-muted" />
                </div>
                <div className="h-6 w-20 rounded bg-muted" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="flex space-x-2">
                  <div className="h-8 w-16 rounded bg-muted" />
                  <div className="h-8 w-16 rounded bg-muted" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="mb-2 text-destructive">Error loading documents</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <FileText className="mx-auto mb-4 size-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">No documents found</h3>
          <p className="text-sm text-muted-foreground">
            {Object.keys(filter).length > 0
              ? 'No documents match your current filters.'
              : 'Get started by uploading your first document.'}
          </p>
        </div>
      </Card>
    );
  }

  const selectionDescription = selectedCount === 1 ? 'selected document' : `${selectedCount} selected documents`;

  return (
    <div className="space-y-4">
      {selectedCount > 0 && (
        <DocumentBulkActionsToolbar
          selectedCount={selectedCount}
          selectableCount={selectableCount}
          onClearSelection={clearSelection}
          onDelete={() => {
            void handleBulkDelete();
          }}
          onMoveTag={() => setShowBulkDialog(true)}
          onExport={() => {
            void handleBulkExport();
          }}
          busyAction={bulkAction}
        />
      )}

      <div className="overflow-hidden rounded-md border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="w-[48px] px-3 py-3 text-left">
                <Checkbox
                  aria-label="Select all documents"
                  checked={headerCheckboxState}
                  onCheckedChange={() => toggleAll()}
                  disabled={selectableCount === 0}
                />
              </th>
              <th scope="col" className="px-3 py-3 text-left font-medium text-foreground">
                Document
              </th>
              <th scope="col" className="w-[160px] px-3 py-3 text-left font-medium text-foreground">
                Status
              </th>
              <th scope="col" className="w-[80px] px-3 py-3 text-right font-medium text-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {documents.map((doc) => {
              const canManage = permissions.canEditDocument(doc);
              const selected = isSelected(doc.id);

              const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
                if ((event.key === ' ' || event.key === 'Spacebar' || event.key === 'Enter') && canManage) {
                  event.preventDefault();
                  toggleItem(doc.id);
                  return;
                }

                if ((event.key === 'a' || event.key === 'A') && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  toggleAll();
                }
              };

              return (
                <tr
                  key={doc.id}
                  className={cn(
                    'align-top transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                    selected ? 'bg-muted/60' : 'hover:bg-muted/30',
                  )}
                  tabIndex={0}
                  aria-selected={selected}
                  onKeyDown={handleRowKeyDown}
                >
                  <td className="px-3 py-4 align-top">
                    <Checkbox
                      aria-label={`Select document ${doc.title}`}
                      checked={selected}
                      onCheckedChange={() => toggleItem(doc.id)}
                      disabled={!canManage}
                    />
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 text-muted-foreground">{getTypeIcon(doc.document_type)}</div>
                      <div className="space-y-2">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-foreground">{doc.title}</span>
                          {doc.description && (
                            <span className="text-xs text-muted-foreground">{doc.description}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            <span>
                              {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          {doc.lease && (
                            <div className="flex items-center gap-1">
                              <Users className="size-3" />
                              <span>Lease • {doc.lease.tenant_ids?.length || 0} tenants</span>
                            </div>
                          )}
                          {doc.signatures && doc.signatures.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Eye className="size-3" />
                              <span>
                                {doc.signatures.filter((s) => s.status === 'signed').length}/
                                {doc.signatures.length} signed
                              </span>
                            </div>
                          )}
                        </div>

                        {doc.signatures && doc.signatures.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Signers:</span>
                            {doc.signatures.slice(0, 3).map((signature) => (
                              <Badge
                                key={signature.id}
                                variant={signature.status === 'signed' ? 'default' : 'outline'}
                                className="text-[11px]"
                              >
                                {signature.signer_name || signature.signer_email.split('@')[0]}
                              </Badge>
                            ))}
                            {doc.signatures.length > 3 && (
                              <Badge variant="secondary" className="text-[11px]">
                                +{doc.signatures.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}

                        {doc.versions && doc.versions.length > 0 && (
                          <div className="space-y-2 rounded-md border border-dashed border-border/60 p-2">
                            <div className="text-[11px] font-medium uppercase text-muted-foreground">
                              Version history
                            </div>
                            <div className="space-y-1">
                              {doc.versions.slice(0, 5).map((version) => (
                                <div
                                  key={version.id}
                                  className="flex items-center justify-between text-[11px] text-muted-foreground"
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge
                                      variant={version.version === doc.version ? 'default' : 'outline'}
                                      className="text-[10px] uppercase"
                                    >
                                      v{version.version}
                                    </Badge>
                                    <Badge
                                      variant={version.state === 'published' ? 'default' : 'secondary'}
                                      className="text-[10px] uppercase"
                                    >
                                      {version.state}
                                    </Badge>
                                    <span>{versionStatusLabel(version.status)}</span>
                                  </div>
                                  <span>
                                    {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex flex-col gap-2">
                      {getStateBadge(doc.state)}
                      {getStatusBadge(doc.status)}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-right">
                    <DocumentActions document={doc} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog
        open={showBulkDialog}
        onOpenChange={(open) => {
          setShowBulkDialog(open);
          if (!open) {
            setBulkForm({ tag: '', unitId: '' });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move or tag documents</DialogTitle>
            <DialogDescription>
              Apply updates to the {selectionDescription}.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              void handleBulkUpdate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor={unitFieldId}>Move to unit</Label>
              <Input
                id={unitFieldId}
                placeholder="Enter destination unit ID"
                value={bulkForm.unitId}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setBulkForm((previous) => ({ ...previous, unitId: event.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to keep the current unit assignment.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor={tagFieldId}>Apply tag</Label>
              <Input
                id={tagFieldId}
                placeholder="e.g. renewal, compliance"
                value={bulkForm.tag}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setBulkForm((previous) => ({ ...previous, tag: event.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Tags are stored in each document&apos;s metadata.
              </p>
            </div>
            <DialogFooter className="sm:space-x-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowBulkDialog(false);
                  setBulkForm({ tag: '', unitId: '' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={selectedCount === 0 || bulkAction === 'update'}>
                {bulkAction === 'update' ? 'Applying…' : 'Apply updates'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
