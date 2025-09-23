'use client';

import { useTransition } from 'react';

import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { createDownloadLink, streamToBlob } from '@/lib/download-client';
import type { DocumentListFilters } from '@/types/documents';

import { exportDocumentsCsv } from '../actions/export-csv';

export function ExportDocumentsButton({ filters }: { filters: DocumentListFilters }) {
  const [isPending, startTransition] = useTransition();

  const handleExport = () => {
    startTransition(async () => {
      try {
        const stream = await exportDocumentsCsv(filters);
        const blob = await streamToBlob(stream);
        const filename = `documents-${new Date().toISOString().slice(0, 10)}.csv`;
        createDownloadLink(blob, filename);
      } catch (error) {
        console.error('Failed to export documents CSV', error);
      }
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={handleExport}
      disabled={isPending}
    >
      <Download className="size-4" aria-hidden="true" />
      {isPending ? 'Exporting…' : 'Export CSV'}
    </Button>
  );
}
