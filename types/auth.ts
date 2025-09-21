import type { Database } from "@/lib/supabase";

export type BuildingRole = Database["public"]["Enums"]["building_role"];

export const ALL_BUILDING_ROLES: BuildingRole[] = [
  "tenant",
  "roommate",
  "property_manager",
  "admin",
];
