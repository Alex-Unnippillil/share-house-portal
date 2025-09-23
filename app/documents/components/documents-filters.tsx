'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { DocumentListFilters, DocumentStatus, DocumentType } from '@/types/documents';
import { Filter, Save, Share2, X } from 'lucide-react';
import {
  areDocumentFiltersEqual,
  documentFiltersToSearchParams,
  isDocumentFilterEmpty,
  normalizeDocumentFilters,
  parseDocumentFiltersFromSearchParams,
} from '@/lib/document-filter-params';
import { useCopyToClipboard } from '@/lib/hooks/use-copy-to-clipboard';
import { saveDocumentViewAction } from '../actions';

type SavedViewState = {
  slug: string;
  filters: DocumentListFilters;
  name?: string;
};

interface DocumentsFiltersProps {
  onFiltersChange?: (filters: DocumentListFilters) => void;
  initialFilters?: DocumentListFilters;
  initialSavedView?: SavedViewState | null;
}

export function DocumentsFilters({
  onFiltersChange,
  initialFilters,
  initialSavedView,
}: DocumentsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [isPending, startTransition] = useTransition();
  const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 1500 });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [savedViews, setSavedViews] = useState<Record<string, SavedViewState>>(() => {
    if (initialSavedView?.slug) {
      return {
        [initialSavedView.slug]: {
          ...initialSavedView,
          filters: normalizeDocumentFilters(initialSavedView.filters),
        },
      };
    }
    return {};
  });

  const [filters, setFilters] = useState<DocumentListFilters>(() => {
    const fromParams = parseDocumentFiltersFromSearchParams(searchParams);
    if (!isDocumentFilterEmpty(fromParams)) {
      return fromParams;
    }
    if (initialFilters && !isDocumentFilterEmpty(initialFilters)) {
      return normalizeDocumentFilters(initialFilters);
    }
    return {};
  });

  useEffect(() => {
    if (initialSavedView?.slug) {
      setSavedViews(prev => {
        if (prev[initialSavedView.slug]) {
          return prev;
        }
        return {
          ...prev,
          [initialSavedView.slug]: {
            ...initialSavedView,
            filters: normalizeDocumentFilters(initialSavedView.filters),
          },
        };
      });
    }
  }, [initialSavedView]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    const slug = params.get('view') ?? undefined;
    const paramsFilters = parseDocumentFiltersFromSearchParams(params);

    if (slug && isDocumentFilterEmpty(paramsFilters)) {
      const cached = slug ? savedViews[slug] : undefined;
      if (cached && !areDocumentFiltersEqual(filters, cached.filters)) {
        setFilters(cached.filters);
        onFiltersChange?.(cached.filters);
      }
      return;
    }

    if (!areDocumentFiltersEqual(filters, paramsFilters)) {
      setFilters(paramsFilters);
      onFiltersChange?.(paramsFilters);
    }
  }, [filters, onFiltersChange, savedViews, searchParamsString]);

  const updateUrl = useCallback(
    (nextFilters: DocumentListFilters, options?: { viewSlug?: string }) => {
      const params = documentFiltersToSearchParams(
        nextFilters,
        new URLSearchParams(searchParamsString)
      );
      if (options?.viewSlug) {
        params.set('view', options.viewSlug);
      } else {
        params.delete('view');
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParamsString]
  );

  const applyFilters = useCallback(
    (next: DocumentListFilters, options?: { viewSlug?: string }) => {
      const normalized = normalizeDocumentFilters(next);
      setFilters(normalized);
      onFiltersChange?.(normalized);
      setMessage(null);
      setError(null);
      updateUrl(normalized, { viewSlug: options?.viewSlug });
    },
    [onFiltersChange, updateUrl]
  );

  const statusOptions: { value: DocumentStatus; label: string }[] = useMemo(
    () => [
      { value: 'draft', label: 'Draft' },
      { value: 'pending_signature', label: 'Pending Signature' },
      { value: 'signed', label: 'Signed' },
      { value: 'expired', label: 'Expired' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
    []
  );

  const typeOptions: { value: DocumentType; label: string }[] = useMemo(
    () => [
      { value: 'lease', label: 'Lease' },
      { value: 'addendum', label: 'Addendum' },
      { value: 'insurance', label: 'Insurance' },
      { value: 'maintenance', label: 'Maintenance' },
      { value: 'other', label: 'Other' },
    ],
    []
  );

  const toggleStatusFilter = (status: DocumentStatus, checked: boolean) => {
    const current = filters.status ?? [];
    const nextStatuses = checked
      ? Array.from(new Set([...current, status]))
      : current.filter(s => s !== status);

    const nextFilters = {
      ...filters,
      status: nextStatuses.length ? nextStatuses : undefined,
    };

    applyFilters(nextFilters);
  };

  const toggleTypeFilter = (type: DocumentType, checked: boolean) => {
    const current = filters.type ?? [];
    const nextTypes = checked
      ? Array.from(new Set([...current, type]))
      : current.filter(t => t !== type);

    const nextFilters = {
      ...filters,
      type: nextTypes.length ? nextTypes : undefined,
    };

    applyFilters(nextFilters);
  };

  const clearFilters = () => {
    applyFilters({});
  };

  const handleShare = () => {
    const params = documentFiltersToSearchParams(filters);
    const viewSlug = searchParams.get('view');

    if (viewSlug) {
      params.set('view', viewSlug);
    } else {
      const matchingSavedView = Object.values(savedViews).find(savedView =>
        areDocumentFiltersEqual(savedView.filters, filters)
      );
      if (matchingSavedView) {
        params.set('view', matchingSavedView.slug);
      }
    }

    const query = params.toString();
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${base}${pathname}${query ? `?${query}` : ''}`;

    copyToClipboard(url);
    setMessage('Link copied to clipboard.');
    setError(null);
  };

  const handleSaveView = () => {
    if (isDocumentFilterEmpty(filters)) {
      setError('Add at least one filter before saving a view.');
      setMessage(null);
      return;
    }

    const suggestedName = searchParams.get('view') && savedViews[searchParams.get('view') ?? '']
      ? savedViews[searchParams.get('view') ?? ''].name
      : undefined;
    const name = window.prompt('Name this view', suggestedName ?? '');
    if (!name) {
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name cannot be empty.');
      setMessage(null);
      return;
    }

    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await saveDocumentViewAction({
        name: trimmedName,
        filters,
      });

      if (!result.success || !result.data) {
        setError(result.error ?? 'Failed to save view.');
        return;
      }

      const normalizedFilters = normalizeDocumentFilters(result.data.filters);
      setSavedViews(prev => ({
        ...prev,
        [result.data.slug]: {
          slug: result.data.slug,
          name: result.data.name,
          filters: normalizedFilters,
        },
      }));

      applyFilters(normalizedFilters, { viewSlug: result.data.slug });
      setMessage(`Saved view “${result.data.name}”.`);
    });
  };

  const activeFilterCount =
    (filters.status?.length ?? 0) +
    (filters.type?.length ?? 0) +
    (filters.tenant_id ? 1 : 0) +
    (filters.unit_id ? 1 : 0) +
    (filters.date_from ? 1 : 0) +
    (filters.date_to ? 1 : 0);

  const copied = Boolean(isCopied);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 size-4" />
            Status
            {filters.status && filters.status.length > 0 && (
              <Badge variant="secondary" className="ml-2 size-4 p-0 text-xs">
                {filters.status.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {statusOptions.map(option => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={filters.status?.includes(option.value) ?? false}
              onCheckedChange={checked => toggleStatusFilter(option.value, checked)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Type
            {filters.type && filters.type.length > 0 && (
              <Badge variant="secondary" className="ml-2 size-4 p-0 text-xs">
                {filters.type.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {typeOptions.map(option => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={filters.type?.includes(option.value) ?? false}
              onCheckedChange={checked => toggleTypeFilter(option.value, checked)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="mr-2 size-4" />
          Clear ({activeFilterCount})
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={handleShare}
        className="text-muted-foreground hover:text-foreground"
      >
        <Share2 className="mr-2 size-4" />
        {copied ? 'Copied' : 'Share'}
      </Button>

      <Button
        size="sm"
        onClick={handleSaveView}
        disabled={isPending || isDocumentFilterEmpty(filters)}
      >
        <Save className="mr-2 size-4" />
        {isPending ? 'Saving…' : 'Save view'}
      </Button>

      {(message || error) && (
        <p
          className={`w-full text-xs ${
            error ? 'text-destructive' : 'text-muted-foreground'
          }`}
        >
          {error ?? message}
        </p>
      )}
    </div>
  );
}
