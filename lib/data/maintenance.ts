import type { TypedSupabaseClient } from "@/utils/typed-supabase-client";
import type {
  MaintenanceParticipant,
  MaintenanceRequest,
  MaintenanceRequestWithRelations,
} from "@/types/maintenance";
import type { Database } from "@/lib/supabase";

interface FetchMaintenanceRequestsParams {
  client: Pick<TypedSupabaseClient, "from">;
  userId: string;
  unitId: string | null | undefined;
  role: Database["public"]["Tables"]["profiles"]["Row"]["role"] | null | undefined;
}

function handlePostgrestError(error: { message: string } | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

export async function fetchMaintenanceRequests({
  client,
  userId,
  unitId,
  role,
}: FetchMaintenanceRequestsParams): Promise<MaintenanceRequestWithRelations[]> {
  let query = (client as any)
    .from("maintenance_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (role !== "property_manager" && role !== "admin") {
    if (unitId) {
      query = query.eq("unit_id", unitId);
    } else {
      query = query.eq("requested_by", userId);
    }
  }

  const { data, error } = await query;

  handlePostgrestError(error, "Failed to fetch maintenance requests");

  const requests = (data ?? []) as MaintenanceRequest[];

  if (requests.length === 0) {
    return [];
  }

  const participantIds = Array.from(
    new Set(
      requests.flatMap((request) =>
        [request.requested_by, request.assigned_to].filter(
          (value): value is string => typeof value === "string" && value.length > 0,
        ),
      ),
    ),
  );

  if (participantIds.length === 0) {
    return requests.map((request) => ({ ...request, requester: null, assignee: null }));
  }

  const { data: profiles, error: profilesError } = await client
    .from("profiles")
    .select("id, email, full_name, avatar_url, role")
    .in("id", participantIds);

  handlePostgrestError(profilesError, "Failed to fetch maintenance request participants");

  const profilesById = new Map<string, MaintenanceParticipant>(
    (profiles as MaintenanceParticipant[] | null | undefined)?.map((profile) => [profile.id, profile]) ?? [],
  );

  return requests.map((request) => ({
    ...request,
    requester: profilesById.get(request.requested_by) ?? null,
    assignee: request.assigned_to ? profilesById.get(request.assigned_to) ?? null : null,
  }));
}
