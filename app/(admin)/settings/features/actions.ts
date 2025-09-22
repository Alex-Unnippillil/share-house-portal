'use server'

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  FEATURE_DEFINITIONS,
  type FeatureToggleInput,
} from "@/lib/features"
import { createSupbaseServerClient } from "@/utils/supaone"

const featureKeySchema = z.enum(
  FEATURE_DEFINITIONS.map((definition) => definition.key) as [
    FeatureToggleInput["key"],
    ...FeatureToggleInput["key"][],
  ]
)

const payloadSchema = z.object({
  householdId: z.string().uuid(),
  key: featureKeySchema,
  enabled: z.boolean(),
})

interface ActionResult {
  success: boolean
  message?: string
}

export async function updateFeatureFlagAction(
  input: FeatureToggleInput
): Promise<ActionResult> {
  const parsed = payloadSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid feature toggle payload.",
    }
  }

  try {
    const supabase = await createSupbaseServerClient()
    const { error } = await supabase
      .from("features")
      .upsert(
        {
          household_id: parsed.data.householdId,
          key: parsed.data.key,
          enabled: parsed.data.enabled,
        },
        { onConflict: "household_id,key" }
      )

    if (error) {
      return {
        success: false,
        message: error.message,
      }
    }

    revalidatePath("/settings/features")

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"

    return {
      success: false,
      message,
    }
  }
}
