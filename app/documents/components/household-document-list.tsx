import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import type { Database } from '@/lib/supabase';
import type { HouseholdLeaseDocument } from '@/types/documents';

import { DownloadDocumentButton } from './download-document-button';

type HouseholdDocumentRow = Database['public']['Tables']['household_documents']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

type DocumentWithUploader = HouseholdDocumentRow &
  HouseholdLeaseDocument & {
    uploader?: Pick<ProfileRow, 'full_name' | 'email'> | null;
  };

interface HouseholdDocumentListProps {
  documents: DocumentWithUploader[];
  selectedUnitId?: string;
  isAdmin?: boolean;
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'Not provided';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatFileSize(size?: number | null) {
  if (!size || size <= 0) {
    return 'Unknown size';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let index = 0;
  let value = size;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function extractMetadata(metadata: HouseholdLeaseDocument['metadata']) {
  const data = (metadata ?? {}) as Record<string, unknown>;

  let rentAmount: number | null = null;
  if (typeof data.rent_amount === 'number') {
    rentAmount = data.rent_amount;
  } else if (typeof data.rent_amount === 'string') {
    const parsed = Number.parseFloat(data.rent_amount);
    rentAmount = Number.isFinite(parsed) ? parsed : null;
  }

  const notes = typeof data.notes === 'string' ? data.notes : undefined;

  return { rentAmount, notes };
}

export function HouseholdDocumentList({
  documents,
  selectedUnitId,
  isAdmin,
}: HouseholdDocumentListProps) {
  if (!selectedUnitId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No household selected</CardTitle>
          <CardDescription>
            {isAdmin
              ? 'Choose a household to review its lease archive.'
              : 'Ask your property manager to link your profile to a household to access shared documents.'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No documents yet</CardTitle>
          <CardDescription>
            {isAdmin
              ? 'Upload the first lease PDF so residents have a single source of truth.'
              : 'Your household has not uploaded any lease PDFs yet.'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((document) => {
        const { rentAmount, notes } = extractMetadata(document.metadata);

        return (
          <Card key={document.id} className="border border-muted">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold">{document.title}</CardTitle>
                <CardDescription className="flex flex-col text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-2">
                  <span>{document.file_name}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{formatFileSize(document.file_size)}</span>
                </CardDescription>
              </div>
              <DownloadDocumentButton documentId={document.id} />
            </CardHeader>
            <CardContent className="space-y-4">
              {document.description ? (
                <p className="text-sm text-muted-foreground">{document.description}</p>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <dl className="space-y-1">
                  <dt className="text-xs uppercase text-muted-foreground">Lease start</dt>
                  <dd className="font-medium">{formatDate(document.lease_start)}</dd>
                </dl>
                <dl className="space-y-1">
                  <dt className="text-xs uppercase text-muted-foreground">Lease end</dt>
                  <dd className="font-medium">{formatDate(document.lease_end)}</dd>
                </dl>
                <dl className="space-y-1">
                  <dt className="text-xs uppercase text-muted-foreground">Uploaded on</dt>
                  <dd className="font-medium">{formatDateTime(document.uploaded_at)}</dd>
                </dl>
                <dl className="space-y-1">
                  <dt className="text-xs uppercase text-muted-foreground">Uploaded by</dt>
                  <dd className="font-medium">
                    {document.uploader?.full_name || document.uploader?.email || 'Unknown user'}
                  </dd>
                </dl>
              </div>

              {rentAmount !== null || notes ? <Separator /> : null}

              <div className="grid gap-4 sm:grid-cols-2">
                {rentAmount !== null ? (
                  <dl className="space-y-1">
                    <dt className="text-xs uppercase text-muted-foreground">Monthly rent</dt>
                    <dd className="font-medium">
                      {new Intl.NumberFormat(undefined, {
                        style: 'currency',
                        currency: 'USD',
                        maximumFractionDigits: 0,
                      }).format(rentAmount)}
                    </dd>
                  </dl>
                ) : null}
                {notes ? (
                  <div className="space-y-1">
                    <p className="text-xs uppercase text-muted-foreground">Notes</p>
                    <p className="text-sm text-muted-foreground">{notes}</p>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
