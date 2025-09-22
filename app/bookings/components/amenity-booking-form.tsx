'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Amenity {
  id: string;
  name: string;
  description: string;
  duration: string;
  maxAdvance: string;
}

export function AmenityBookingForm({ amenity }: { amenity: Amenity }) {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleBook = async () => {
    setLoading(true);
    setStatusMessage(`Opening booking flow for ${amenity.name}`);
    try {
      // Placeholder: open Cal.com or show a toast
      toast.success(`Opening booking flow for ${amenity.name}`);
      await new Promise((resolve) => setTimeout(resolve, 400));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <Button onClick={handleBook} disabled={loading} aria-busy={loading}>
        {loading ? 'Booking…' : 'Book now'}
      </Button>
      <span aria-live="polite" className="sr-only">
        {statusMessage}
      </span>
    </div>
  );
}



