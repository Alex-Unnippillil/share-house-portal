import type { Json } from "@/lib/supabase";
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client";

export type LogEventInput = {
  buildingId: string;
  entityType: string;
  entityId: string;
  eventType: string;
  actorId?: string | null;
  metadata?: Record<string, unknown> | null;
};

function normaliseMetadata(metadata?: Record<string, unknown> | null): Json | null {
  if (!metadata) {
    return null;
  }

  return JSON.parse(JSON.stringify(metadata)) as Json;
}

export async function logEvent(client: TypedSupabaseClient, input: LogEventInput) {
  const { data, error } = await client
    .from("events")
    .insert({
      building_id: input.buildingId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      event_type: input.eventType,
      actor_id: input.actorId ?? null,
      metadata: normaliseMetadata(input.metadata),
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
