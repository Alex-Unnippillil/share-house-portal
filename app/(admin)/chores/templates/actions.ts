"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createActionClient } from "@/utils/supabase/actions";
import type { TablesInsert, TablesUpdate } from "@/lib/supabase";

import {
  CHORE_CADENCES,
  type ChoreTemplateFormValues,
} from "./config";

const choreTemplateSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters long")
    .max(120, "Title must be 120 characters or fewer"),
  cadence: z.enum(CHORE_CADENCES),
  point_value: z
    .number({ invalid_type_error: "Point value must be a number" })
    .refine((value) => Number.isFinite(value), {
      message: "Point value must be a valid number",
    })
    .int({ message: "Point value must be a whole number" })
    .min(0, "Point value cannot be negative")
    .max(1000, "Point value must be 1000 points or fewer"),
  requires_proof: z.boolean(),
});

type ActionResult = { success: true } | { success: false; error: string };

type ValidatedPayload = z.infer<typeof choreTemplateSchema>;

function validateInput(
  values: ChoreTemplateFormValues
): { success: true; data: ValidatedPayload } | { success: false; error: string } {
  const result = choreTemplateSchema.safeParse(values);

  if (!result.success) {
    const message =
      result.error.issues[0]?.message ?? "Invalid chore template data";

    return { success: false, error: message };
  }

  return { success: true, data: result.data };
}

export async function createChoreTemplate(
  values: ChoreTemplateFormValues
): Promise<ActionResult> {
  const validation = validateInput(values);

  if (!validation.success) {
    return validation;
  }

  const supabase = await createActionClient();

  const payload: TablesInsert<"chores"> = {
    cadence: validation.data.cadence,
    point_value: validation.data.point_value,
    requires_proof: validation.data.requires_proof,
    title: validation.data.title,
  };

  const { error } = await supabase.from("chores").insert(payload);

  if (error) {
    console.error("Failed to create chore template", error);
    return {
      success: false,
      error: "Unable to create chore template. Please try again.",
    };
  }

  revalidatePath("/chores/templates", "page");

  return { success: true };
}

export async function updateChoreTemplate(
  id: number,
  values: ChoreTemplateFormValues
): Promise<ActionResult> {
  if (!Number.isFinite(id)) {
    return { success: false, error: "Invalid chore template identifier" };
  }

  const validation = validateInput(values);

  if (!validation.success) {
    return validation;
  }

  const supabase = await createActionClient();

  const payload: TablesUpdate<"chores"> = {
    cadence: validation.data.cadence,
    point_value: validation.data.point_value,
    requires_proof: validation.data.requires_proof,
    title: validation.data.title,
  };

  const { error } = await supabase
    .from("chores")
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error("Failed to update chore template", error);
    return {
      success: false,
      error: "Unable to update chore template. Please try again.",
    };
  }

  revalidatePath("/chores/templates", "page");

  return { success: true };
}

export async function deleteChoreTemplate(id: number): Promise<ActionResult> {
  if (!Number.isFinite(id)) {
    return { success: false, error: "Invalid chore template identifier" };
  }

  const supabase = await createActionClient();

  const { error } = await supabase.from("chores").delete().eq("id", id);

  if (error) {
    console.error("Failed to delete chore template", error);
    return {
      success: false,
      error: "Unable to delete chore template. Please try again.",
    };
  }

  revalidatePath("/chores/templates", "page");

  return { success: true };
}
