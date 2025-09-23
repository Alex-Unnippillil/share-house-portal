'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/components/ui/use-toast';
import {
  cleanDocumentFilters,
  countActiveDocumentFilters,
  describeDocumentFilters,
  normalizeDocumentFilters,
  serializeDocumentFilters,
} from '@/lib/documents-filters';
import {
  DocumentListFilters,
  DocumentSavedView,
  DocumentStatus,
  DocumentType,
} from '@/types/documents';
import { Filter, Save, X } from 'lucide-react';
import { saveDocumentSavedViewAction } from '../actions';

interface DocumentsFiltersProps {
  initialFilters: DocumentListFilters;
  savedViews: DocumentSavedView[];
  activeViewId: string | null;
}

const statusOptions: { value: DocumentStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_signature', label: 'Pending Signature' },
  { value: 'signed', label: 'Signed' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
];

const typeOptions: { value: DocumentType; label: string }[] = [
  { value: 'lease', label: 'Lease' },
  { value: 'addendum', label: 'Addendum' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' },
];

function toDateInputValue(value?: string) {
  return value ? value.slice(0, 10) : '';
}

function fromDateInputValue(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

export function DocumentsFilters({ initialFilters, savedViews, activeViewId }: DocumentsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [filters, setFilters] = useState<DocumentListFilters>(() =>
    normalizeDocumentFilters(initialFilters),
  );
  const [draftFilters, setDraftFilters] = useState<DocumentListFilters>(() =>
    normalizeDocumentFilters(initialFilters),
  );
  const [views, setViews] = useState<DocumentSavedView[]>(() => savedViews);
  const [selectedViewId, setSelectedViewId] = useState<string | null>(activeViewId);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  useEffect(() => {
    const normalized = normalizeDocumentFilters(initialFilters);
    setFilters(normalized);
    if (!isFilterDialogOpen) {
      setDraftFilters(normalized);
    }
  }, [initialFilters, isFilterDialogOpen]);

  useEffect(() => {
    setViews(savedViews);
  }, [savedViews]);

  useEffect(() => {
    setSelectedViewId(activeViewId);
  }, [activeViewId]);

  const normalizedDraft = useMemo(
    () => normalizeDocumentFilters(draftFilters),
    [draftFilters],
  );

  const activeFilterCount = useMemo(
    () => countActiveDocumentFilters(filters),
    [filters],
  );

  const filterDescriptions = useMemo(
    () => describeDocumentFilters(filters),
    [filters],
  );

  const updateDraftStatus = (status: DocumentStatus, checked: boolean) => {
    setDraftFilters((current) => {
      const statuses = current.status ?? [];
      const nextStatuses = checked
        ? Array.from(new Set([...statuses, status]))
        : statuses.filter((value) => value !== status);

      const next: DocumentListFilters = {
        ...current,
        status: nextStatuses.length > 0 ? nextStatuses : undefined,
      };

      return normalizeDocumentFilters(next);
    });
  };

  const updateDraftType = (type: DocumentType, checked: boolean) => {
    setDraftFilters((current) => {
      const types = current.type ?? [];
      const nextTypes = checked
        ? Array.from(new Set([...types, type]))
        : types.filter((value) => value !== type);

      const next: DocumentListFilters = {
        ...current,
        type: nextTypes.length > 0 ? nextTypes : undefined,
      };

      return normalizeDocumentFilters(next);
    });
  };

  const applyFilters = (nextFilters: DocumentListFilters, viewId: string | null) => {
    const normalized = normalizeDocumentFilters(nextFilters);
    setFilters(normalized);
    setDraftFilters(normalized);
    const cleaned = cleanDocumentFilters(normalized);

    const params = new URLSearchParams(searchParams.toString());
    const serialized = serializeDocumentFilters(cleaned);

    if (serialized) {
      params.set('filters', serialized);
    } else {
      params.delete('filters');
    }

    if (viewId) {
      params.set('view', viewId);
    } else {
      params.delete('view');
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    setSelectedViewId(viewId);
  };

  const handleSelectView = (value: string) => {
    if (value === '__clear__') {
      applyFilters({}, null);
      return;
    }

    const view = views.find((item) => item.id === value);
    if (!view) {
      return;
    }

    applyFilters(view.filters, view.id);
  };

  const handleOpenSaveDialog = () => {
    const selectedView = selectedViewId
      ? views.find((view) => view.id === selectedViewId)
      : undefined;

    setNewViewName(selectedView?.name ?? '');
    setSaveError(null);
    setIsSaveDialogOpen(true);
  };

  const handleSaveView = () => {
    const trimmedName = newViewName.trim();
    if (!trimmedName) {
      setSaveError('Please provide a name for this view.');
      return;
    }

    const existingSelected = selectedViewId
      ? views.find((view) => view.id === selectedViewId)
      : undefined;

    const payload = {
      id:
        existingSelected && existingSelected.name === trimmedName
          ? existingSelected.id
          : undefined,
      name: trimmedName,
      filters,
    };

    setSaveError(null);

    startSaving(async () => {
      const result = await saveDocumentSavedViewAction(payload);
      if (result.success && result.data) {
        const cleaned = cleanDocumentFilters(result.data.filters);
        const updatedView: DocumentSavedView = {
          ...result.data,
          filters: cleaned,
        };

        setViews((current) => {
          const withoutCurrent = current.filter((view) => view.id !== updatedView.id);
          return [...withoutCurrent, updatedView].sort((a, b) =>
            a.name.localeCompare(b.name),
          );
        });

        applyFilters(updatedView.filters, updatedView.id);
        setIsSaveDialogOpen(false);
        toast({
          title: 'View saved',
          description: `“${updatedView.name}” is available in your saved views.`,
        });
      } else {
        const message = result.error ?? 'Unable to save this view. Please try again.';
        setSaveError(message);
        toast({
          variant: 'destructive',
          title: 'Failed to save view',
          description: message,
        });
      }
    });
  };

  const handleClearFilters = () => {
    applyFilters({}, null);
  };

  const handleApplyDraft = () => {
    applyFilters(draftFilters, null);
    setIsFilterDialogOpen(false);
  };

  return (
    <div className="flex flex-col space-y-2 text-left sm:items-end sm:text-right">
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <Select
          value={selectedViewId ?? undefined}
          onValueChange={handleSelectView}
        >
          <SelectTrigger className="w-[220px]" disabled={views.length === 0}>
            <SelectValue placeholder={views.length ? 'Saved views' : 'No saved views'} />
          </SelectTrigger>
          <SelectContent>
            {views.length === 0 && (
              <SelectItem value="__empty" disabled>
                No saved views yet
              </SelectItem>
            )}
            {views.map((view) => (
              <SelectItem key={view.id} value={view.id}>
                {view.name}
              </SelectItem>
            ))}
            <SelectSeparator />
            <SelectItem value="__clear__">Clear selection</SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleOpenSaveDialog}
        >
          <Save className="mr-2 size-4" />
          Save view
        </Button>

        <Dialog
          open={isFilterDialogOpen}
          onOpenChange={(open) => {
            setIsFilterDialogOpen(open);
            if (open) {
              setDraftFilters(filters);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 size-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2 size-5 px-1">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Build filters</DialogTitle>
              <DialogDescription>
                Combine conditions to narrow down documents by status, type, tenant, unit, and date.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-2">
              <div className="space-y-3">
                <Label className="text-xs uppercase text-muted-foreground">Status</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {statusOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center space-x-2 rounded-md border border-border/60 px-3 py-2 text-sm"
                    >
                      <Checkbox
                        checked={normalizedDraft.status?.includes(option.value) ?? false}
                        onCheckedChange={(checked) =>
                          updateDraftStatus(option.value, Boolean(checked))
                        }
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs uppercase text-muted-foreground">Type</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {typeOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center space-x-2 rounded-md border border-border/60 px-3 py-2 text-sm"
                    >
                      <Checkbox
                        checked={normalizedDraft.type?.includes(option.value) ?? false}
                        onCheckedChange={(checked) =>
                          updateDraftType(option.value, Boolean(checked))
                        }
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tenant-filter">Tenant ID</Label>
                  <Input
                    id="tenant-filter"
                    value={normalizedDraft.tenant_id ?? ''}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        tenant_id: event.target.value ? event.target.value : undefined,
                      }))
                    }
                    placeholder="e.g. UUID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit-filter">Unit</Label>
                  <Input
                    id="unit-filter"
                    value={normalizedDraft.unit_id ?? ''}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        unit_id: event.target.value ? event.target.value : undefined,
                      }))
                    }
                    placeholder="Unit identifier"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date-from">Created after</Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={toDateInputValue(normalizedDraft.date_from)}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        date_from: fromDateInputValue(event.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date-to">Created before</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={toDateInputValue(normalizedDraft.date_to)}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        date_to: fromDateInputValue(event.target.value),
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setDraftFilters(filters)}>
                Reset changes
              </Button>
              <Button variant="outline" onClick={handleClearFilters}>
                <X className="mr-2 size-4" />
                Clear all
              </Button>
              <Button onClick={handleApplyDraft}>Apply filters</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="mr-2 size-4" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>

      {filterDescriptions.length > 0 && (
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {filterDescriptions.map((description) => (
            <Badge key={description} variant="outline">
              {description}
            </Badge>
          ))}
        </div>
      )}

      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save current view</DialogTitle>
            <DialogDescription>
              Give this filter configuration a memorable name to reuse it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="view-name">View name</Label>
            <Input
              id="view-name"
              value={newViewName}
              onChange={(event) => setNewViewName(event.target.value)}
              placeholder="e.g. Pending renewals"
              autoFocus
            />
            {saveError && (
              <p className="text-sm text-destructive">{saveError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveView} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save view'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
