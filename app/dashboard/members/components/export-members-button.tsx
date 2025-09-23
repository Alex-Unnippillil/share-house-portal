'use client';

import { useTransition } from 'react';

import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { createDownloadLink, streamToBlob } from '@/lib/download-client';

import { exportMembersCsv, type MemberExportFilters } from '../actions/export-csv';

export function ExportMembersButton({ filters }: { filters: MemberExportFilters }) {
  const [isPending, startTransition] = useTransition();

  const handleExport = () => {
    startTransition(async () => {
      try {
        const stream = await exportMembersCsv(filters);
        const blob = await streamToBlob(stream);
        const filename = `members-${new Date().toISOString().slice(0, 10)}.csv`;
        createDownloadLink(blob, filename);
      } catch (error) {
        console.error('Failed to export members CSV', error);
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
