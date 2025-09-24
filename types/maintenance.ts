import type { Database } from "@/lib/supabase";

export type MaintenanceRequest = Database["public"]["Tables"]["maintenance_requests"]["Row"];

export type MaintenanceParticipant = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "email" | "full_name" | "avatar_url" | "role"
>;

export type MaintenanceRequestWithRelations = MaintenanceRequest & {
  requester: MaintenanceParticipant | null;
  assignee: MaintenanceParticipant | null;
};

export type MaintenanceStatusEventState = "complete" | "current" | "upcoming";

export interface MaintenanceStatusEvent {
  id: string;
  label: string;
  description: string;
  occurredAt: string | null;
  state: MaintenanceStatusEventState;
}
