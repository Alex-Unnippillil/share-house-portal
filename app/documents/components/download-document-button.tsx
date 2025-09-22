'use client';

import { useTransition } from 'react';
import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

import { createLeaseDownloadLink } from '../actions';

interface DownloadDocumentButtonProps {
  documentId: string;
}

export function DownloadDocumentButton({ documentId }: DownloadDocumentButtonProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleDownload = () => {
    startTransition(async () => {
      const result = await createLeaseDownloadLink(documentId);

      if (!result.success || !result.data?.url) {
        toast({
          title: 'Download failed',
          description: result.error ?? 'We could not prepare that download link. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      window.location.assign(result.data.url);
    });
  };

  return (
    <Button type="button" variant="secondary" onClick={handleDownload} disabled={isPending}>
      <Download className="mr-2 h-4 w-4" aria-hidden="true" />
      {isPending ? 'Preparing…' : 'Download'}
    </Button>
  );
}
