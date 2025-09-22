import type { Database } from "@/lib/supabase";

export type SupplyDefaultSplit = Database["public"]["Enums"]["supply_default_split"];
export type SupplyItem = Database["public"]["Tables"]["supply_items"]["Row"];
export type SupplyItemInsert = Database["public"]["Tables"]["supply_items"]["Insert"];
export type SupplyItemUpdate = Database["public"]["Tables"]["supply_items"]["Update"];

export type SupplyActionState = {
        status: "idle" | "success" | "error";
        message?: string;
        fieldErrors?: Record<string, string>;
};

export const SUPPLY_ACTION_INITIAL_STATE: SupplyActionState = { status: "idle" };

export const SUPPLY_SPLIT_OPTIONS: Array<{
        value: SupplyDefaultSplit;
        label: string;
        description: string;
}> = [
        {
                value: "equal",
                label: "Equal split",
                description: "Share supply costs evenly across all roommates.",
        },
        {
                value: "weighted",
                label: "Weighted split",
                description: "Use roommate weightings defined on the unit to apportion costs.",
        },
];
