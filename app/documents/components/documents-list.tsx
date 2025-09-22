'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocumentWithLease, DocumentListFilters } from '@/types/documents';
import { getDocumentsAction } from '../actions';
import { DocumentActions } from './document-actions';
import { formatDistanceToNow } from 'date-fns';
import { FileText, Users, Calendar, Eye } from 'lucide-react';

const STATUS_VARIANTS = {
  draft: 'secondary',
  pending_signature: 'outline',
  signed: 'default',
  expired: 'destructive',
  cancelled: 'secondary',
} as const;

const STATUS_LABELS = {
  draft: 'Draft',
  pending_signature: 'Pending Signature',
  signed: 'Signed',
  expired: 'Expired',
  cancelled: 'Cancelled',
} as const;

type NormalizedFilter = DocumentListFilters | Record<string, never>;

function normalizeFilter(filter: DocumentListFilters | undefined): NormalizedFilter {
  if (!filter) {
    return {};
  }

  const normalized: DocumentListFilters = {};

  if (filter.status?.length) {
    normalized.status = [...filter.status].sort();
  }

  if (filter.type?.length) {
    normalized.type = [...filter.type].sort();
  }

  if (filter.tenant_id) {
    normalized.tenant_id = filter.tenant_id;
  }

  if (filter.unit_id) {
    normalized.unit_id = filter.unit_id;
  }

  if (filter.date_from) {
    normalized.date_from = filter.date_from;
  }

  if (filter.date_to) {
    normalized.date_to = filter.date_to;
  }

  return normalized;
}

function createFilterKey(filter: NormalizedFilter) {
  return JSON.stringify(filter ?? {});
}

function areFiltersEqual(prev: DocumentsListProps, next: DocumentsListProps) {
  const prevNormalized = normalizeFilter(prev.filter);
  const nextNormalized = normalizeFilter(next.filter);
  return createFilterKey(prevNormalized) === createFilterKey(nextNormalized);
}

interface DocumentCardProps {
  document: DocumentWithLease;
}

const DocumentCard = memo(({ document }: DocumentCardProps) => {
  const createdLabel = useMemo(
    () => formatDistanceToNow(new Date(document.created_at), { addSuffix: true }),
    [document.created_at],
  );

  const statusVariant = STATUS_VARIANTS[document.status as keyof typeof STATUS_VARIANTS] ?? 'secondary';
  const statusLabel = STATUS_LABELS[document.status as keyof typeof STATUS_LABELS] ?? document.status;

  const typeIcon = useMemo(() => {
    switch (document.document_type) {
      case 'lease':
      case 'addendum':
        return <FileText className="size-4" />;
      case 'insurance':
        return <Users className="size-4" />;
      default:
        return <FileText className="size-4" />;
    }
  }, [document.document_type]);

  const signedCount = useMemo(
    () => document.signatures?.filter((signature) => signature.status === 'signed').length ?? 0,
    [document.signatures],
  );

  const totalSignatures = document.signatures?.length ?? 0;

  const visibleSignatures = useMemo(
    () => document.signatures?.slice(0, 3) ?? [],
    [document.signatures],
  );

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="mt-1">{typeIcon}</div>
            <div className="space-y-1">
              <h3 className="font-medium leading-none">{document.title}</h3>
              {document.description ? (
                <p className="text-sm text-muted-foreground">{document.description}</p>
              ) : null}
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Calendar className="size-3" />
                  <span>{createdLabel}</span>
                </div>
                {document.lease ? (
                  <div className="flex items-center space-x-1">
                    <Users className="size-3" />
                    <span>Lease • {document.lease.tenant_ids?.length ?? 0} tenants</span>
                  </div>
                ) : null}
                {totalSignatures > 0 ? (
                  <div className="flex items-center space-x-1">
                    <Eye className="size-3" />
                    <span>
                      {signedCount}/{totalSignatures} signed
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={statusVariant}>{statusLabel}</Badge>
            <DocumentActions document={document} />
          </div>
        </div>
      </CardHeader>
      {totalSignatures > 0 ? (
        <CardContent className="pt-0">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">Signers:</span>
            {visibleSignatures.map((signature) => (
              <Badge
                key={signature.id}
                variant={signature.status === 'signed' ? 'default' : 'outline'}
                className="text-xs"
              >
                {signature.signer_name || signature.signer_email.split('@')[0]}
              </Badge>
            ))}
            {totalSignatures > visibleSignatures.length ? (
              <Badge variant="secondary" className="text-xs">
                +{totalSignatures - visibleSignatures.length} more
              </Badge>
            ) : null}
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}, (prev, next) => prev.document.id === next.document.id && prev.document.updated_at === next.document.updated_at);

DocumentCard.displayName = 'DocumentCard';

interface DocumentsListProps {
  filter: DocumentListFilters;
}

export const DocumentsList = memo(function DocumentsList({ filter }: DocumentsListProps) {
  const [documents, setDocuments] = useState<DocumentWithLease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const normalizedFilter = useMemo(() => normalizeFilter(filter), [filter]);
  const filterKey = useMemo(() => createFilterKey(normalizedFilter), [normalizedFilter]);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const result = await getDocumentsAction(normalizedFilter as DocumentListFilters);
        if (result.success && result.data) {
          setDocuments(result.data);
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
  }, [filterKey, normalizedFilter]);

  const documentCards = useMemo(
    () => documents.map((doc) => <DocumentCard key={doc.id} document={doc} />),
    [documents],
  );

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
    return (
      <Card className="p-12">
        <div className="text-center">
          <FileText className="mx-auto mb-4 size-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">No documents found</h3>
          <p className="text-sm text-muted-foreground">
            {Object.keys(filter).length > 0
              ? "No documents match your current filters."
              : "Get started by uploading your first document."}
          </p>
        </div>
      </Card>
    );
  }

  return <div className="space-y-4">{documentCards}</div>;
}, areFiltersEqual);
