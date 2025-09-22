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

  const handleBook = async () => {
    setLoading(true);
    try {
      // Placeholder: open Cal.com or show a toast
      toast.success(`Opening booking flow for ${amenity.name}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <Button onClick={handleBook} disabled={loading}>
        {loading ? 'Booking…' : 'Book now'}
      </Button>
    </div>
  );
}



