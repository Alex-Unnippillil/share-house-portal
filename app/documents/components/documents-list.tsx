'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FlowStateCard } from "@/components/feedback/flow-state";
import { SemanticStatusBadge } from "@/components/status/semantic-status-badge";
import { Button } from "@/components/ui/button";
import { DocumentWithLease, DocumentListFilters } from '@/types/documents';
import { getDocumentsAction } from '../actions';
import { DocumentActions } from './document-actions';
import { DocumentsListSkeleton } from './documents-list-skeleton';
import { formatDistanceToNow } from 'date-fns';
import { FileText, Users, Calendar, Eye, Bell, Receipt } from 'lucide-react';

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
    const labels = {
      draft: "Draft",
      pending_signature: "Pending Signature",
      signed: "Signed",
      expired: "Expired",
      cancelled: "Cancelled",
    } as const;

    const semanticStatus = {
      draft: "neutral",
      pending_signature: "in-progress",
      signed: "success",
      expired: "error",
      cancelled: "warning",
    } as const;

    return (
      <SemanticStatusBadge
        status={semanticStatus[status as keyof typeof semanticStatus] ?? "neutral"}
        label={labels[status as keyof typeof labels] || status}
      />
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lease':
        return <FileText className="size-4" />;
      case 'notice':
        return <Bell className="size-4" />;
      case 'account_file':
        return <Receipt className="size-4" />;
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
      <FlowStateCard
        variant="error"
        title="Unable to load documents"
        description={error}
        action={
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        }
      />
    );
  }

  if (documents.length === 0) {
    return (
      <FlowStateCard
        variant="empty"
        title="No documents found"
        description={
          Object.keys(filter).length > 0
            ? "No documents match your current filters."
            : "Get started by uploading your first document."
        }
      />
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
