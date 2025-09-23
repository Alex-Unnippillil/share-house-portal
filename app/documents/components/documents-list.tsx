'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Table, { TableSelectionProvider, useTableSelection } from "@/components/ui/Table";
import { Checkbox } from "@/components/ui/checkbox";
import BulkActionsBar from "@/components/tables/BulkActionsBar";
import { cn } from "@/lib/utils";
import { DocumentWithLease, DocumentListFilters } from '@/types/documents';
import { getDocumentsAction } from '../actions';
import { DocumentActions } from './document-actions';
import { formatDistanceToNow } from 'date-fns';
import { FileText, Users } from 'lucide-react';

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

  const headers = ['Document', 'Type', 'Status', 'Updated', 'Actions'];

  return (
    <TableSelectionProvider>
      <div className="space-y-4">
        <BulkActionsBar entityType="documents" />
        <Table headers={headers} selectable>
          {documents.map((doc) => (
            <DocumentRow
              key={doc.id}
              document={doc}
              renderStatus={getStatusBadge}
              renderTypeIcon={getTypeIcon}
            />
          ))}
        </Table>
      </div>
    </TableSelectionProvider>
  );
}

const rowGridStyle = {
  gridTemplateColumns: 'var(--table-grid-template)',
} satisfies CSSProperties;

function DocumentRow({
  document,
  renderStatus,
  renderTypeIcon,
}: {
  document: DocumentWithLease;
  renderStatus: (status: string) => ReactNode;
  renderTypeIcon: (type: string) => ReactNode;
}) {
  const { toggleRowSelection, isRowSelected, registerRow, unregisterRow } = useTableSelection();

  useEffect(() => {
    registerRow(document.id);
    return () => unregisterRow(document.id);
  }, [document.id, registerRow, unregisterRow]);

  const selected = isRowSelected(document.id);
  const signedCount = document.signatures?.filter((signature) => signature.status === 'signed').length ?? 0;

  return (
    <div
      className={cn(
        'grid items-center gap-4 px-5 py-3 text-sm transition-colors',
        'bg-white dark:bg-inherit',
        selected && 'bg-zinc-100 dark:bg-zinc-900/60'
      )}
      style={rowGridStyle}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={() => toggleRowSelection(document.id)}
        aria-label={`Select ${document.title}`}
      />

      <div className="flex flex-col gap-1 overflow-hidden">
        <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{document.title}</span>
        {document.description && (
          <span className="truncate text-xs text-muted-foreground">{document.description}</span>
        )}
        {document.lease && (
          <span className="truncate text-xs text-muted-foreground">
            Lease • {document.lease.tenant_ids?.length || 0} tenants
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {renderTypeIcon(document.document_type)}
        <span className="capitalize">{document.document_type}</span>
      </div>

      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        {renderStatus(document.status)}
        {document.signatures && document.signatures.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {signedCount}/{document.signatures.length} signed
          </span>
        )}
      </div>

      <div className="flex flex-col items-end gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-end sm:gap-3">
        <span>{formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}</span>
        <DocumentActions document={document} />
      </div>
    </div>
  );
}
