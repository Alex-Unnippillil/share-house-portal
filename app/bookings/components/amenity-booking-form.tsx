'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import type { AmenityId } from './amenities';

interface AmenitySummary {
  id: AmenityId;
  name: string;
}

export function AmenityBookingForm({ amenity }: { amenity: AmenitySummary }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleBook = () => {
    startTransition(() => {
      router.push(`/bookings/${amenity.id}?modal=book`, { scroll: false });
    });
  };

  return (
    <div className="flex items-center justify-between">
      <Button onClick={handleBook} disabled={isPending}>
        {isPending ? 'Opening…' : 'Book now'}
      </Button>
    </div>
  );
}



