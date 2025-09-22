import type { Json } from '@/lib/supabase';
import { getServiceRoleClient, insertEvent } from '@/queries/events';
import type { EventAction } from '@/queries/events';
import { z } from 'zod';

const jsonValue: z.ZodType<Json> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValue), z.record(jsonValue)]),
);

const jsonRecord = z.record(jsonValue);

const bookingEventSchema = z.object({
  householdId: z.string().uuid(),
  memberId: z.string().uuid().optional(),
  bookingId: z.string().min(1),
  action: z.enum(['created', 'rescheduled', 'cancelled']),
  payload: jsonRecord.optional(),
});

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch (error) {
    return Response.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const parsed = bookingEventSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      {
        error: 'Invalid booking event payload.',
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { householdId, memberId, bookingId, action, payload: eventDetails } = parsed.data;

  try {
    const client = getServiceRoleClient();
    const eventAction = `booking.${action}` as EventAction;
    const eventPayload = {
      bookingId,
      actorMemberId: memberId ?? null,
      ...(eventDetails ?? {}),
    } satisfies Json;

    const event = await insertEvent(client, {
      household_id: householdId,
      member_id: memberId ?? null,
      action: eventAction,
      entity_type: 'booking',
      entity_id: bookingId,
      payload: eventPayload,
    });

    return Response.json({ event }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
