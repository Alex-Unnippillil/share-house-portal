'use client';

import {
  memo,
  type ComponentProps,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from 'lucide-react';
import {
  DocumentListFilters,
  DocumentSignature,
  DocumentStatus,
  DocumentType,
  DocumentWithLease,
} from '@/types/documents';
import { getDocumentsAction } from '../actions';
import { DocumentActions } from './document-actions';
import { formatDistanceToNow } from 'date-fns';
import { FileText, Users, Calendar, Eye } from 'lucide-react';

const LOADING_SKELETON_INDICES = [0, 1, 2];

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>["variant"]>;

const STATUS_VARIANTS: Record<DocumentStatus, BadgeVariant> = {
  draft: 'secondary',
  pending_signature: 'outline',
  signed: 'default',
  expired: 'destructive',
  cancelled: 'secondary',
};

const STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: 'Draft',
  pending_signature: 'Pending Signature',
  signed: 'Signed',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

const DOCUMENT_TYPE_ICONS: Record<DocumentType, LucideIcon> = {
  lease: FileText,
  addendum: FileText,
  insurance: Users,
  maintenance: FileText,
  other: FileText,
};

const EMPTY_SIGNATURES: DocumentSignature[] = [];

function renderStatusBadge(status: DocumentStatus) {
  return (
    <Badge variant={STATUS_VARIANTS[status] ?? 'secondary'}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

interface DocumentCardItemProps {
  document: DocumentWithLease;
}

const DocumentCardItem = memo(function DocumentCardItem({
  document,
}: DocumentCardItemProps) {
  const IconComponent = DOCUMENT_TYPE_ICONS[document.document_type] ?? FileText;
  const signatures = document.signatures ?? EMPTY_SIGNATURES;
  const formattedCreatedAt = useMemo(
    () =>
      formatDistanceToNow(new Date(document.created_at), {
        addSuffix: true,
      }),
    [document.created_at]
  );
  const signedCount = signatures.filter(
    signature => signature.status === 'signed'
  ).length;
  const hasSignatures = signatures.length > 0;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="mt-1">
              <IconComponent className="size-4" />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium leading-none">{document.title}</h3>
              {document.description && (
                <p className="text-sm text-muted-foreground">
                  {document.description}
                </p>
              )}
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Calendar className="size-3" />
                  <span>{formattedCreatedAt}</span>
                </div>
                {document.lease && (
                  <div className="flex items-center space-x-1">
                    <Users className="size-3" />
                    <span>
                      Lease • {document.lease.tenant_ids?.length || 0} tenants
                    </span>
                  </div>
                )}
                {hasSignatures && (
                  <div className="flex items-center space-x-1">
                    <Eye className="size-3" />
                    <span>
                      {signedCount}/{signatures.length} signed
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {renderStatusBadge(document.status)}
            <DocumentActions document={document} />
          </div>
        </div>
      </CardHeader>
      {hasSignatures && (
        <CardContent className="pt-0">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">Signers:</span>
            {signatures.slice(0, 3).map((signature) => (
              <Badge
                key={signature.id}
                variant={
                  signature.status === 'signed' ? 'default' : 'outline'
                }
                className="text-xs"
              >
                {signature.signer_name ||
                  signature.signer_email.split('@')[0]}
              </Badge>
            ))}
            {signatures.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{signatures.length - 3} more
              </Badge>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
});

DocumentCardItem.displayName = 'DocumentCardItem';

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

  if (loading) {
    return (
      <div className="space-y-4">
        {LOADING_SKELETON_INDICES.map((index) => (
          <Card key={index} className="animate-pulse">
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
        <DocumentCardItem key={doc.id} document={doc} />
      ))}
    </div>
  );
}
