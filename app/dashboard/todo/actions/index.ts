"use server";

import { revalidatePath } from "next/cache";

import { createActionClient } from "@/utils/supabase/actions";
import { PRIORITY_LEVELS, type PriorityLevel } from "../constants";

const DASHBOARD_TODO_PATH = "/dashboard/todo";

async function getAuthenticatedContext() {
  const supabase = await createActionClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("You must be signed in to manage household supplies.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("We couldn't find your household profile.");
  }

  return { supabase, userId: user.id, householdId: profile.household_id };
}

function validatePriority(priority: string): PriorityLevel {
  if ((PRIORITY_LEVELS as readonly string[]).includes(priority)) {
    return priority as PriorityLevel;
  }

  throw new Error("Invalid priority supplied.");
}

export async function addToBuyItem(input: {
  itemName?: string;
  supplyItemId?: string;
  priority: string;
}) {
  const priority = validatePriority(input.priority);
  const trimmedName = input.itemName?.trim();

  if (!input.supplyItemId && !trimmedName) {
    throw new Error("Select an existing item or provide a name for a new one.");
  }

  const { supabase, userId, householdId } = await getAuthenticatedContext();

  let supplyItemId = input.supplyItemId ?? null;

  if (supplyItemId) {
    const { data: existingItem, error: existingError } = await supabase
      .from("supply_items")
      .select("id")
      .eq("id", supplyItemId)
      .eq("household_id", householdId)
      .single();

    if (existingError || !existingItem) {
      throw new Error("The selected supply item is no longer available.");
    }
  } else if (trimmedName) {
    const { data: existingItems, error: fetchError } = await supabase
      .from("supply_items")
      .select("id")
      .eq("household_id", householdId)
      .ilike("name", trimmedName)
      .limit(1);

    if (fetchError) {
      throw new Error("Unable to verify existing supply items.");
    }

    const existingMatch = existingItems?.[0];

    if (existingMatch) {
      supplyItemId = existingMatch.id;
    } else {
      const { data: createdItem, error: createError } = await supabase
        .from("supply_items")
        .insert({
          name: trimmedName,
          household_id: householdId,
          created_by: userId,
        })
        .select("id")
        .single();

      if (createError || !createdItem) {
        throw new Error("Unable to create the new supply item.");
      }

      supplyItemId = createdItem.id;
    }
  }

  if (!supplyItemId) {
    throw new Error("Unable to resolve a supply item for this request.");
  }

  const { data: existingToBuy, error: existingToBuyError } = await supabase
    .from("to_buy_items")
    .select("id, priority")
    .eq("household_id", householdId)
    .eq("supply_item_id", supplyItemId)
    .is("fulfilled_at", null)
    .maybeSingle();

  if (existingToBuyError) {
    throw new Error("Unable to check your open to-buy items.");
  }

  if (existingToBuy) {
    if (existingToBuy.priority !== priority) {
      const { error: updateError } = await supabase
        .from("to_buy_items")
        .update({ priority })
        .eq("id", existingToBuy.id);

      if (updateError) {
        throw new Error("Unable to update the existing item priority.");
      }
    }
  } else {
    const { error: insertError } = await supabase.from("to_buy_items").insert({
      supply_item_id: supplyItemId,
      priority,
      household_id: householdId,
      added_by: userId,
    });

    if (insertError) {
      throw new Error("Unable to add the item to your shopping list.");
    }
  }

  revalidatePath(DASHBOARD_TODO_PATH);
}

export async function removeToBuyItem(id: string) {
  const { supabase, householdId } = await getAuthenticatedContext();

  const { error } = await supabase
    .from("to_buy_items")
    .delete()
    .eq("id", id)
    .eq("household_id", householdId);

  if (error) {
    throw new Error("Unable to remove the selected item.");
  }

  revalidatePath(DASHBOARD_TODO_PATH);
}

export async function logPurchase(toBuyItemId: string, notes?: string) {
  const { supabase, userId, householdId } = await getAuthenticatedContext();

  const { data: targetItem, error: fetchError } = await supabase
    .from("to_buy_items")
    .select("id, supply_item_id, household_id, fulfilled_at")
    .eq("id", toBuyItemId)
    .eq("household_id", householdId)
    .single();

  if (fetchError || !targetItem) {
    throw new Error("Unable to locate the selected to-buy item.");
  }

  const { error: insertError } = await supabase.from("household_purchases").insert({
    household_id: householdId,
    supply_item_id: targetItem.supply_item_id,
    purchased_by: userId,
    notes: notes?.trim() || null,
  });

  if (insertError) {
    throw new Error("Unable to log the purchase for this item.");
  }

  revalidatePath(DASHBOARD_TODO_PATH);
}
