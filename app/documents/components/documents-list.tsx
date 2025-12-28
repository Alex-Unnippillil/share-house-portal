'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocumentWithLease, DocumentListFilters } from '@/types/documents';
import { getDocumentsAction } from '../actions';
import { DocumentActions } from './document-actions';
import { DocumentsListSkeleton } from './documents-list-skeleton';
import { formatDistanceToNow } from 'date-fns';
import { FilePlus, FileText, Users, Calendar, Eye } from 'lucide-react';
import {
  buildEmptyStateSuggestions,
  hasActiveFilters,
} from './empty-state-suggestions';

interface DocumentsListProps {
  filter: DocumentListFilters;
}

export function DocumentsList({ filter }: DocumentsListProps) {
  const [documents, setDocuments] = useState<DocumentWithLease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeFilters = useMemo(() => hasActiveFilters(filter), [filter]);
  const emptyStateSuggestions = useMemo(
    () => buildEmptyStateSuggestions(filter),
    [filter],
  );

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
    return <DocumentsListSkeleton rows={3} />;
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
    const handleCreateFromTemplate = () => {
      const templateUrl = 'https://documenso.com/templates?ref=roomsily';
      window.open(templateUrl, '_blank', 'noopener,noreferrer');
    };

    return (
      <Card className="p-12">
        <div className="mx-auto max-w-2xl space-y-6 text-center">
          <FileText className="mx-auto size-12 text-muted-foreground" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium">No documents found</h3>
            <p className="text-sm text-muted-foreground">
              {activeFilters
                ? 'No documents match your current filters. Try relaxing them or start fresh below.'
                : 'Get started by creating your first document from a template or exploring sample data.'}
            </p>
          </div>

          <div className="space-y-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recommended next steps
            </p>
            <ul className="space-y-3">
              {emptyStateSuggestions.map((suggestion, index) => (
                <li
                  key={`${suggestion.title}-${index}`}
                  className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10 p-4"
                >
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">{suggestion.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {suggestion.description}
                      {suggestion.link && (
                        <>
                          {' '}
                          <a
                            href={suggestion.link.href}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-primary underline-offset-4 hover:underline"
                          >
                            {suggestion.link.label}
                          </a>
                          .
                        </>
                      )}
                    </p>
                    {suggestion.chips && suggestion.chips.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {suggestion.chips.map((chip) => (
                          <Badge
                            key={chip}
                            variant="outline"
                            className="border-primary/40 bg-primary/5 text-xs font-medium text-primary"
                          >
                            {chip}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button onClick={handleCreateFromTemplate} className="min-w-[200px]">
              <FilePlus className="mr-2 size-4" />
              Create from template
            </Button>
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
    </div>
  );
}
