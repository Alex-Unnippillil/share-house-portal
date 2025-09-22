import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { findBookingConflicts } from '@/lib/booking-conflicts';
import { createClient } from '@/utils/supabase/server';

const payloadSchema = z.object({
  amenityId: z.string().min(1, 'amenityId is required'),
  startTime: z.string().datetime({ offset: true }),
  endTime: z.string().datetime({ offset: true }),
  excludeBookingId: z.string().optional(),
  limit: z.number().int().positive().max(50).optional(),
});

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid booking conflict payload.',
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { amenityId, startTime, endTime, excludeBookingId, limit } = parsed.data;

  if (new Date(startTime) >= new Date(endTime)) {
    return NextResponse.json(
      {
        error: 'startTime must be strictly earlier than endTime.',
      },
      { status: 400 }
    );
  }

  const supabase = createClient();

  try {
    const result = await findBookingConflicts(
      supabase,
      {
        amenityId,
        startTime,
        endTime,
        excludeBookingId,
      },
      { limit }
    );

    return NextResponse.json({
      conflicts: result.conflicts,
      metrics: result.metrics,
    });
  } catch (error) {
    console.error('Failed to check booking conflicts via API route', error);
    return NextResponse.json(
      {
        error: 'Unable to check booking conflicts at this time.',
      },
      { status: 500 }
    );
  }
}
