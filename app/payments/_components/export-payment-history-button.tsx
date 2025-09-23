'use client';

import { useTransition } from 'react';

import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { createDownloadLink } from '@/lib/download-client';
import { createPaymentHistoryCsv } from '@/lib/payments/receipts';
import type { PaymentReceiptHistoryEntry } from '@/types/payments';

export function ExportPaymentHistoryButton({
  receipts,
}: {
  receipts: PaymentReceiptHistoryEntry[];
}) {
  const [isPending, startTransition] = useTransition();

  const handleExport = () => {
    startTransition(() => {
      try {
        const csvContent = createPaymentHistoryCsv(receipts);
        const blob = new Blob([csvContent], {
          type: 'text/csv;charset=utf-8',
        });
        const filename = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
        createDownloadLink(blob, filename);
      } catch (error) {
        console.error('Failed to export payment history CSV', error);
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
