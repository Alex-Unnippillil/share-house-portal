import { redirect } from "next/navigation";

import ToBuyList from "./components/ToBuyList";
import { createClient } from "@/utils/supabase/server";
import { PRIORITY_LEVELS, type PriorityLevel } from "./constants";

function isPriorityLevel(value: string): value is PriorityLevel {
  return (PRIORITY_LEVELS as readonly string[]).includes(value);
}

export default async function Todo() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin?redirect=/dashboard/todo");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single();

  const householdId = profile?.household_id ?? user.id;

  const { data: toBuyItems } = await supabase
    .from("to_buy_items")
    .select(
      `id, priority, fulfilled_at, created_at, supply_item:supply_items ( id, name )`
    )
    .eq("household_id", householdId)
    .order("fulfilled_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });

  const { data: supplyItems } = await supabase
    .from("supply_items")
    .select("id, name")
    .eq("household_id", householdId)
    .order("name", { ascending: true });

  const items = (toBuyItems ?? []).map((item) => ({
    id: item.id,
    priority: isPriorityLevel(item.priority) ? item.priority : "medium",
    fulfilled_at: item.fulfilled_at,
    created_at: item.created_at,
    supply_item: item.supply_item,
  }));

  return (
    <div className="w-full space-y-6 p-4 md:p-8">
      <h1 className="text-3xl font-bold">Household shopping list</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Track communal supplies, assign priorities, and automatically mark items fulfilled when
        someone logs a purchase.
      </p>
      <ToBuyList items={items} supplyItems={supplyItems ?? []} />
    </div>
  );
}
