'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VirtualizedList } from "@/components/ui/virtualized-list";
import { cn } from "@/lib/utils";
import { DocumentWithLease, DocumentListFilters } from '@/types/documents';
import { getDocumentsAction } from '../actions';
import { DocumentActions } from './document-actions';
import { formatDistanceToNow } from 'date-fns';
import { FileText, Users, Calendar, Eye } from 'lucide-react';

interface DocumentsListProps {
  filter: DocumentListFilters;
}

export function DocumentsList({ filter }: DocumentsListProps) {
  const [documents, setDocuments] = useState<DocumentWithLease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const result = await getDocumentsAction(filter);
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
  }, [filter]);

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

  const toTitleCase = (input: string) =>
    input
      .split('_')
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');

  const formatFilterValue = (key: string, value: string) => {
    if (key === 'date_from' || key === 'date_to') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    }

    return toTitleCase(value);
  };

  const activeFilterLabels = Object.entries(filter).flatMap(([key, rawValue]) => {
    if (!rawValue || (Array.isArray(rawValue) && rawValue.length === 0)) {
      return [];
    }

    const label = toTitleCase(key);

    if (Array.isArray(rawValue)) {
      return rawValue.map((value) => `${label}: ${formatFilterValue(key, value)}`);
    }

    return [`${label}: ${formatFilterValue(key, String(rawValue))}`];
  });

  const filterSummary = activeFilterLabels.length > 0 ? activeFilterLabels.join(' • ') : 'All documents';

  const header = (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Filters</p>
        <p className="truncate font-medium text-foreground">{filterSummary}</p>
      </div>
      <div className="text-right">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Documents</p>
        <p className="font-semibold text-foreground">{documents.length}</p>
      </div>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-lg border bg-background/60">
      <VirtualizedList
        items={documents}
        getItemKey={(doc) => doc.id}
        className="max-h-[70vh]"
        innerClassName="px-4"
        staticInnerClassName="px-4"
        itemClassName=""
        stickyHeader={header}
        estimateSize={() => 192}
        minItemCountForVirtualization={8}
        renderItem={(doc, index) => {
          const totalSignatures = doc.signatures?.length ?? 0;
          const signedCount =
            doc.signatures?.reduce(
              (count, signature) => count + (signature.status === 'signed' ? 1 : 0),
              0,
            ) ?? 0;

          return (
            <div className={cn('pb-4', index === 0 && 'pt-4')}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">{getTypeIcon(doc.document_type)}</div>
                      <div className="space-y-1">
                        <h3 className="font-medium leading-none">{doc.title}</h3>
                        {doc.description ? (
                          <p className="text-sm text-muted-foreground">{doc.description}</p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Calendar className="size-3" />
                            <span>{formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}</span>
                          </div>
                          {doc.lease ? (
                            <div className="flex items-center space-x-1">
                              <Users className="size-3" />
                              <span>Lease • {doc.lease.tenant_ids?.length || 0} tenants</span>
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
                      {getStatusBadge(doc.status)}
                      <DocumentActions document={doc} />
                    </div>
                  </div>
                </CardHeader>
                {totalSignatures > 0 ? (
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">Signers:</span>
                      {doc.signatures?.slice(0, 3).map((signature) => (
                        <Badge
                          key={signature.id}
                          variant={signature.status === 'signed' ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {signature.signer_name || signature.signer_email.split('@')[0]}
                        </Badge>
                      ))}
                      {totalSignatures > 3 ? (
                        <Badge variant="secondary" className="text-xs">
                          +{totalSignatures - 3} more
                        </Badge>
                      ) : null}
                    </div>
                  </CardContent>
                ) : null}
              </Card>
            </div>
          );
        }}
      />
    </div>
  );
}
