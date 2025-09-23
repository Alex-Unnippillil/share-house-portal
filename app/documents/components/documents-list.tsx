'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { track } from '@vercel/analytics/react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocumentWithLease, DocumentListFilters, DocumentStatus, DocumentType } from '@/types/documents';
import { getDocumentsAction } from '../actions';
import { DocumentActions } from './document-actions';
import { formatDistanceToNow } from 'date-fns';
import { Calendar, Eye, FileText, Filter, PlusCircle, Search, Sparkles, Users } from 'lucide-react';
import { UploadDocumentDialog } from './upload-document-dialog';

type HelperContext = {
  current: DocumentListFilters;
  initial: DocumentListFilters;
};

type FilterHelper = {
  id: string;
  label: string;
  description?: string;
  nextFilter: (context: HelperContext) => DocumentListFilters;
};

const STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: 'Draft',
  pending_signature: 'Pending Signature',
  signed: 'Signed',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

const TYPE_LABELS: Record<DocumentType, string> = {
  lease: 'Lease',
  addendum: 'Addendum',
  insurance: 'Insurance',
  maintenance: 'Maintenance',
  other: 'Other',
};

function normalizeFilter(filter: DocumentListFilters) {
  return {
    ...filter,
    status: filter.status ? [...filter.status].sort() : undefined,
    type: filter.type ? [...filter.type].sort() : undefined,
} satisfies DocumentListFilters;
}

function filterToKey(filter: DocumentListFilters) {
  return JSON.stringify(normalizeFilter(filter));
}

const EMPTY_FILTER_KEY = filterToKey({});

function describeFilter(filter: DocumentListFilters) {
  const parts: string[] = [];

  if (filter.status?.length) {
    const statusDescription = filter.status
      .map((status) => STATUS_LABELS[status] ?? status)
      .join(', ');
    parts.push(statusDescription);
  }

  if (filter.type?.length) {
    const typeDescription = filter.type
      .map((type) => TYPE_LABELS[type] ?? type)
      .join(', ');
    parts.push(`${typeDescription} documents`);
  }

  if (filter.tenant_id) {
    parts.push('tenant specific');
  }

  if (filter.unit_id) {
    parts.push('unit scoped');
  }

  if (filter.date_from || filter.date_to) {
    parts.push('date range');
  }

  if (parts.length === 0) {
    return 'all documents';
  }

  return parts.join(' • ');
}

interface DocumentsListProps {
  filter: DocumentListFilters;
}

export function DocumentsList({ filter }: DocumentsListProps) {
  const [documents, setDocuments] = useState<DocumentWithLease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<DocumentListFilters>(filter);
  const initialFilterRef = useRef<DocumentListFilters>(filter);
  const initialFilterKeyRef = useRef(filterToKey(filter));

  useEffect(() => {
    const incomingKey = filterToKey(filter);
    if (incomingKey !== initialFilterKeyRef.current) {
      initialFilterRef.current = filter;
      initialFilterKeyRef.current = incomingKey;
      setActiveFilter(filter);
    }
  }, [filter]);

  const activeFilterKey = useMemo(() => filterToKey(activeFilter), [activeFilter]);

  useEffect(() => {
    let isCurrent = true;

    const fetchDocuments = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getDocumentsAction(activeFilter);
        if (!isCurrent) {
          return;
        }

        if (result.success && result.data) {
          setDocuments(result.data);
          setError(null);
        } else {
          setDocuments([]);
          setError(result.error || 'Failed to fetch documents');
        }
      } catch (err) {
        console.error('Error fetching documents:', err);
        setDocuments([]);
        setError('An unexpected error occurred');
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    fetchDocuments();
    return () => {
      isCurrent = false;
    };
  }, [activeFilter, activeFilterKey]);

  const initialFilterKeySnapshot = initialFilterKeyRef.current;
  const initialDescriptor = describeFilter(initialFilterRef.current);

  const helperCards = useMemo<FilterHelper[]>(() => {
    const defaults: FilterHelper[] = [
      {
        id: 'show_all_documents',
        label: 'Show all documents',
        description: 'Clear filters and review the complete document library.',
        nextFilter: () => ({}),
      },
      {
        id: 'view_pending_signatures',
        label: 'View pending signatures',
        description: 'Focus on agreements waiting for roommates to sign.',
        nextFilter: () => ({ status: ['pending_signature'] }),
      },
      {
        id: 'review_signed_documents',
        label: 'Review signed agreements',
        description: 'Jump to finalized leases and completed addendums.',
        nextFilter: () => ({ status: ['signed'] }),
      },
    ];

    if (initialFilterKeySnapshot !== EMPTY_FILTER_KEY) {
      defaults.unshift({
        id: 'reset_to_initial',
        label: `Reset to ${initialDescriptor}`,
        description: 'Return to the tab default that you started from.',
        nextFilter: () => ({ ...initialFilterRef.current }),
      });
    }

    return defaults;
  }, [initialDescriptor, initialFilterKeySnapshot]);

  const sampleChips = useMemo<FilterHelper[]>(() => (
    [
      {
        id: 'chip_lease',
        label: 'Lease agreements',
        nextFilter: () => ({ type: ['lease'] }),
      },
      {
        id: 'chip_insurance',
        label: 'Insurance certificates',
        nextFilter: () => ({ type: ['insurance'] }),
      },
      {
        id: 'chip_addendum',
        label: 'Roommate addendums',
        nextFilter: () => ({ type: ['addendum'] }),
      },
    ]
  ), []);

  const handleHelperSelection = (helper: FilterHelper, surface: 'card' | 'chip') => {
    const nextFilter = helper.nextFilter({
      current: activeFilter,
      initial: initialFilterRef.current,
    });

    setError(null);
    setActiveFilter(nextFilter);

    track('documents_empty_helper_selected', {
      helper_id: helper.id,
      surface,
      previous_filter: activeFilterKey,
      next_filter: filterToKey(nextFilter),
    });
  };

  const getStatusBadge = (status: string) => {
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
  };

  const getStateBadge = (state: string) => {
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
  };

  const versionStatusLabel = (status: string) => {
    const labels = {
      draft: 'Draft Saved',
      pending_signature: 'Sent for Signature',
      signed: 'Signed',
      expired: 'Expired',
      cancelled: 'Cancelled',
    } as const;

    return labels[status as keyof typeof labels] || status;
  };

  const getTypeIcon = (type: string) => {
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
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-5 w-48 rounded bg-muted"></div>
                  <div className="h-4 w-32 rounded bg-muted"></div>
                </div>
                <div className="h-6 w-20 rounded bg-muted"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 rounded bg-muted"></div>
                <div className="flex space-x-2">
                  <div className="h-8 w-16 rounded bg-muted"></div>
                  <div className="h-8 w-16 rounded bg-muted"></div>
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
    const activeDescriptor = describeFilter(activeFilter);
    const hasActiveFilters = Boolean(
      (activeFilter.status && activeFilter.status.length > 0) ||
      (activeFilter.type && activeFilter.type.length > 0) ||
      activeFilter.tenant_id ||
      activeFilter.unit_id ||
      activeFilter.date_from ||
      activeFilter.date_to
    );

    const headline = hasActiveFilters
      ? 'No documents match these filters'
      : 'Your document library is empty';
    const supportingCopy = hasActiveFilters ? (
      <>
        We couldn’t find any documents for <span className="font-medium text-foreground">{activeDescriptor}</span>. Try one of the quick adjustments below or create a new document.
      </>
    ) : (
      'Upload your first document to centralize leases, policies, and shared agreements for the household.'
    );

    return (
      <Card className="p-10">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-full border border-dashed border-primary/40 bg-primary/5 text-primary">
            <Sparkles className="size-6" aria-hidden />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">{headline}</h3>
            <p className="text-sm text-muted-foreground">{supportingCopy}</p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {sampleChips.map((chip) => (
              <Button
                key={chip.id}
                size="sm"
                variant="secondary"
                onClick={() => handleHelperSelection(chip, 'chip')}
                className="flex items-center gap-1"
              >
                <Search className="size-3" aria-hidden />
                {chip.label}
              </Button>
            ))}
          </div>

          <div className="grid w-full gap-3 md:grid-cols-2 lg:grid-cols-3">
            {helperCards.map((helper) => (
              <button
                key={helper.id}
                type="button"
                onClick={() => handleHelperSelection(helper, 'card')}
                className="flex h-full flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 p-4 text-left transition hover:border-primary/40 hover:bg-background"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Filter className="size-4 text-muted-foreground" aria-hidden />
                  {helper.label}
                </div>
                {helper.description ? (
                  <p className="text-xs text-muted-foreground">{helper.description}</p>
                ) : null}
              </button>
            ))}
          </div>

          <div className="flex flex-col items-center gap-2">
            <UploadDocumentDialog
              triggerLabel="Create document"
              triggerIcon={<PlusCircle className="size-4" aria-hidden />}
              triggerProps={{ size: 'sm' }}
              onOpen={() =>
                track('documents_empty_helper_selected', {
                  helper_id: 'create_document',
                  surface: 'create_action',
                  previous_filter: activeFilterKey,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Need to log something new? Uploading immediately adds it to the shared library.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <Card key={doc.id} className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="mt-1">
                  {getTypeIcon(doc.document_type)}
                </div>
                <div className="space-y-1">
                  <h3 className="font-medium leading-none">{doc.title}</h3>
                  {doc.description && (
                    <p className="text-sm text-muted-foreground">
                      {doc.description}
                    </p>
                  )}
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Calendar className="size-3" />
                      <span>
                        {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {doc.lease && (
                      <div className="flex items-center space-x-1">
                        <Users className="size-3" />
                        <span>Lease • {doc.lease.tenant_ids?.length || 0} tenants</span>
                      </div>
                    )}
                    {doc.signatures && doc.signatures.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <Eye className="size-3" />
                        <span>
                          {doc.signatures.filter(s => s.status === 'signed').length}/
                          {doc.signatures.length} signed
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getStateBadge(doc.state)}
                {getStatusBadge(doc.status)}
                <DocumentActions document={doc} />
              </div>
            </div>
          </CardHeader>
          {(doc.signatures && doc.signatures.length > 0) && (
            <CardContent className="pt-0">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">Signers:</span>
                {doc.signatures.slice(0, 3).map((signature) => (
                  <Badge
                    key={signature.id}
                    variant={signature.status === 'signed' ? 'default' : 'outline'}
                    className="text-xs"
                  >
                    {signature.signer_name || signature.signer_email.split('@')[0]}
                  </Badge>
                ))}
                {doc.signatures.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{doc.signatures.length - 3} more
                  </Badge>
                )}
              </div>
            </CardContent>
          )}

          {doc.versions && doc.versions.length > 0 && (
            <CardContent className="pt-3">
              <div className="border-t pt-3">
                <div className="text-xs font-medium uppercase text-muted-foreground">
                  Version history
                </div>
                <div className="mt-2 space-y-2">
                  {doc.versions.slice(0, 5).map((version) => (
                    <div
                      key={version.id}
                      className="flex items-center justify-between text-xs text-muted-foreground"
                    >
                      <div className="flex items-center space-x-2">
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
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
