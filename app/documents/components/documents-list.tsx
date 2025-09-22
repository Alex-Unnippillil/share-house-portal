'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocumentWithLease, DocumentListFilters } from '@/types/documents';
import { getDocumentsAction } from '../actions';
import { DocumentActions } from './document-actions';
import { formatDistanceToNow } from 'date-fns';
import { FileText, Users, Calendar, Eye } from 'lucide-react';
import type { PaginationMetadata } from '@/types/pagination';
import { PaginationControls } from '@/components/pagination-controls';

interface DocumentsListProps {
  filter: DocumentListFilters;
}

const PAGE_SIZE = 10;

export function DocumentsList({ filter }: DocumentsListProps) {
  const [documents, setDocuments] = useState<DocumentWithLease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [cursorMap, setCursorMap] = useState<Record<number, string | null>>({ 1: null });

  const filterKey = useMemo(() => JSON.stringify(filter ?? {}), [filter]);
  const filtersForRequest = useMemo<DocumentListFilters>(() => {
    return JSON.parse(filterKey) as DocumentListFilters;
  }, [filterKey]);
  const cursorForPage = cursorMap[currentPage] ?? null;

  useEffect(() => {
    setCurrentPage(1);
    setCursorMap({ 1: null });
  }, [filterKey]);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await getDocumentsAction({
          filters: filtersForRequest,
          pagination: {
            limit: PAGE_SIZE,
            page: currentPage,
            cursor: cursorForPage ?? undefined,
          },
        });

        if (result.success && result.data) {
          setDocuments(result.data.items);
          setPagination(result.data.pagination);
          setCursorMap(prev => {
            const next = { ...prev };

            if (result.data.pagination.nextCursor) {
              next[currentPage + 1] = result.data.pagination.nextCursor;
            } else {
              delete next[currentPage + 1];
            }

            if (currentPage > 1) {
              next[currentPage - 1] = result.data.pagination.prevCursor ?? null;
            }

            next[currentPage] = cursorForPage ?? null;

            return next;
          });
        } else {
          setError(result.error || 'Failed to fetch documents');
          setDocuments([]);
          setPagination(null);
        }
      } catch (err) {
        console.error('Error fetching documents:', err);
        setError('An unexpected error occurred');
        setDocuments([]);
        setPagination(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [filterKey, currentPage, cursorForPage, filtersForRequest]);

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

  const handlePageChange = (page: number) => {
    if (!pagination) return;
    if (page < 1) return;
    if (pagination.pageCount > 0 && page > pagination.pageCount) return;
    if (page !== currentPage) {
      setCurrentPage(page);
    }
  };

  if (loading && documents.length === 0) {
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
                {getStatusBadge(doc.status)}
                <DocumentActions document={doc} />
              </div>
            </div>
          </CardHeader>
          {doc.signatures && doc.signatures.length > 0 && (
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
        </Card>
      ))}
      {pagination && (
        <PaginationControls
          page={pagination.page}
          pageCount={pagination.pageCount}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={handlePageChange}
          isLoading={loading}
        />
      )}
    </div>
  );
}
