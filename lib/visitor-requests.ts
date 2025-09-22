import { z } from "zod";

import type { Database } from "@/lib/supabase";
import { logEvent } from "@/lib/events";
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client";

const dateSchema = z
  .string()
  .transform((value) => new Date(value))
  .pipe(z.date());

const createVisitorRequestSchema = z.object({
  buildingId: z.string().uuid(),
  hostProfileId: z.string().uuid(),
  guestName: z.string().min(1),
  arrivalDate: dateSchema,
  departureDate: dateSchema,
  reason: z.string().max(2000).optional(),
  requiresVote: z.boolean().optional(),
  eligibleVoterIds: z.array(z.string().uuid()).default([]),
  actorId: z.string().uuid(),
});

export type CreateVisitorRequestInput = z.input<typeof createVisitorRequestSchema>;

type VisitorRequestStatus = Database["public"]["Enums"]["visitor_request_status"];
type PollOutcome = Database["public"]["Enums"]["poll_outcome"];

type VisitorRequestRow = Database["public"]["Tables"]["visitor_requests"]["Row"];
type PollRow = Database["public"]["Tables"]["polls"]["Row"];

type CreatePollResult = PollRow | null;

type CreateVisitorRequestResult = {
  request: VisitorRequestRow;
  poll: CreatePollResult;
};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function createVisitorRequest(
  client: TypedSupabaseClient,
  payload: CreateVisitorRequestInput,
): Promise<CreateVisitorRequestResult> {
  const parsed = createVisitorRequestSchema.parse(payload);

  if (parsed.departureDate < parsed.arrivalDate) {
    throw new Error("Departure date must be on or after the arrival date.");
  }

  const eligibleVoterCount = parsed.eligibleVoterIds.length;
  const shouldSeekVote = parsed.requiresVote ?? eligibleVoterCount > 0;
  const requiresVote = shouldSeekVote && eligibleVoterCount > 0;
  const initialStatus: VisitorRequestStatus = requiresVote ? "pending_vote" : "approved";

  const { data: request, error } = await client
    .from("visitor_requests")
    .insert({
      building_id: parsed.buildingId,
      host_profile_id: parsed.hostProfileId,
      guest_name: parsed.guestName,
      arrival_date: toIsoDate(parsed.arrivalDate),
      departure_date: toIsoDate(parsed.departureDate),
      reason: parsed.reason ?? null,
      status: initialStatus,
      requires_vote: requiresVote,
      approved_at: requiresVote ? null : new Date().toISOString(),
      approved_by: requiresVote ? null : parsed.actorId,
    })
    .select()
    .single();

  if (error || !request) {
    throw error ?? new Error("Failed to create visitor request.");
  }

  let poll: CreatePollResult = null;

  if (requiresVote) {
    poll = await createApprovalPoll(client, {
      request,
      eligibleVoterIds: parsed.eligibleVoterIds,
      actorId: parsed.actorId,
    });
  } else {
    await logEvent(client, {
      buildingId: request.building_id,
      entityType: "visitor_request",
      entityId: request.id,
      eventType: "visitor_request.approved",
      actorId: parsed.actorId,
      metadata: {
        method: "auto",
        requestedVote: shouldSeekVote,
        eligibleVoterCount,
      },
    });
  }

  return { request, poll };
}

const createPollSchema = z.object({
  request: z.custom<VisitorRequestRow>(),
  eligibleVoterIds: z.array(z.string().uuid()),
  actorId: z.string().uuid(),
});

type CreatePollInput = z.input<typeof createPollSchema>;

async function createApprovalPoll(
  client: TypedSupabaseClient,
  input: CreatePollInput,
): Promise<PollRow | null> {
  const parsed = createPollSchema.parse(input);

  if (!parsed.eligibleVoterIds.length) {
    return null;
  }

  const requiredVotes = Math.max(parsed.eligibleVoterIds.length, 1);

  const { data: poll, error } = await client
    .from("polls")
    .insert({
      building_id: parsed.request.building_id,
      created_by: parsed.actorId,
      visitor_request_id: parsed.request.id,
      question: `Approve overnight visitor ${parsed.request.guest_name}?`,
      required_votes: requiredVotes,
      metadata: {
        eligibleVoterIds: parsed.eligibleVoterIds,
        requestId: parsed.request.id,
      },
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return poll;
}

export type OverrideStatus = Extract<VisitorRequestStatus, "approved" | "denied">;

export async function overrideVisitorRequestStatus(
  client: TypedSupabaseClient,
  params: {
    requestId: string;
    nextStatus: OverrideStatus;
    actorId: string;
    reason?: string;
  },
): Promise<VisitorRequestRow> {
  const { requestId, nextStatus, actorId } = params;

  const { data: existing, error: existingError } = await client
    .from("visitor_requests")
    .select()
    .eq("id", requestId)
    .single();

  if (existingError || !existing) {
    throw existingError ?? new Error("Visitor request not found.");
  }

  const updates: Partial<VisitorRequestRow> = {
    status: nextStatus,
    requires_vote: false,
  };

  if (nextStatus === "approved") {
    updates.approved_at = new Date().toISOString();
    updates.approved_by = actorId;
    updates.denied_at = null;
    updates.denied_by = null;
  } else {
    updates.denied_at = new Date().toISOString();
    updates.denied_by = actorId;
    updates.approved_at = null;
    updates.approved_by = null;
  }

  const { data: updated, error: updateError } = await client
    .from("visitor_requests")
    .update(updates)
    .eq("id", requestId)
    .select()
    .single();

  if (updateError || !updated) {
    throw updateError ?? new Error("Unable to update visitor request status.");
  }

  const eventType = nextStatus === "approved" ? "visitor_request.approved" : "visitor_request.denied";

  await logEvent(client, {
    buildingId: updated.building_id,
    entityType: "visitor_request",
    entityId: updated.id,
    eventType,
    actorId,
    metadata: {
      method: "admin_override",
      reason: params.reason ?? null,
    },
  });

  await syncAssociatedPoll(client, {
    requestId: updated.id,
    nextStatus,
    actorId,
  });

  return updated;
}

async function syncAssociatedPoll(
  client: TypedSupabaseClient,
  input: { requestId: string; nextStatus: OverrideStatus; actorId: string },
) {
  const { data: poll, error } = await client
    .from("polls")
    .select()
    .eq("visitor_request_id", input.requestId)
    .maybeSingle();

  if (error || !poll) {
    return;
  }

  if (poll.status === "closed") {
    return;
  }

  const outcome: PollOutcome = input.nextStatus === "approved" ? "approved" : "denied";

  await client
    .from("polls")
    .update({
      status: "closed",
      outcome,
      created_by: poll.created_by ?? input.actorId,
    })
    .eq("id", poll.id);
}
